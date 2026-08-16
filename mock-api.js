// Shared logic for the local mock of MeCallAPI (https://www.mecallapi.com)
// from the article "ใช้แค่ HTML, CSS, JavaScript และ API ก็ทำหน้าเว็บ Login ได้".
//
// Used by:
//  - server.js              (local dev:  node server.js)
//  - netlify/functions/api.mjs  (production deploy on Netlify)
import crypto from "crypto";

const SECRET = "mecallapi-mock-secret";

// Supabase (PostgREST) — used to authenticate registered users.
const SUPABASE_URL = "https://jwugmipfeuegtuscmvbv.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_nLNd7tODmYdO43F6dgdrSw_jppTyHMF";
const SUPABASE_TABLE = `${SUPABASE_URL}/rest/v1/user_profiles`;

// YouTube channel "ครบเครื่อง เรื่องไอที" — ALL public uploads via the
// YouTube Data API v3 (needs an API key; playlistItems + videos.list stats).
const YOUTUBE_CHANNEL_ID = "UCVVIub76pjnkDCD5fHTJ2vQ";
// Uploads playlist = "UU" + channel ID (standard YouTube convention)
const YOUTUBE_UPLOADS_PLAYLIST = "UU" + YOUTUBE_CHANNEL_ID.slice(2);
const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY ||
  "AIzaSyA5KwcoAzvhLlnR7gBf4fpACywFqw5_JBY";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Simple in-memory cache (10 min) so the API key isn't hammered on every page load
let videoCache = { at: 0, playlists: null };

function pickThumb(t) {
  return (t && (t.high.url || t.medium.url || t.default.url)) || "";
}

// Fetch the channel's playlists (paged 50 at a time)
async function fetchPlaylists(pageToken) {
  const params = new URLSearchParams({
    part: "snippet",
    channelId: YOUTUBE_CHANNEL_ID,
    maxResults: "50",
    key: YOUTUBE_API_KEY,
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || `YouTube API ${res.status}`);
  }
  return res.json();
}

// Fetch ALL items of one playlist (paged 50 at a time)
async function fetchPlaylistItems(playlistId, pageToken) {
  const params = new URLSearchParams({
    part: "snippet",
    playlistId,
    maxResults: "50",
    key: YOUTUBE_API_KEY,
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || `YouTube API ${res.status}`);
  }
  return res.json();
}

// Fetch view counts for up to 50 video ids
async function fetchVideoStats(ids) {
  const params = new URLSearchParams({
    part: "statistics",
    id: ids.join(","),
    key: YOUTUBE_API_KEY,
  });
  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  if (!res.ok) return {};
  const data = await res.json();
  const stats = {};
  for (const item of data.items || []) {
    if (item.statistics) stats[item.id] = item.statistics.viewCount || "0";
  }
  return stats;
}

// Fetch ALL public playlists of the channel, each with its videos + view counts.
// Uploads playlist goes first, then the other playlists.
async function fetchAllYouTubePlaylists() {
  const now = Date.now();
  if (videoCache.playlists && now - videoCache.at < 10 * 60 * 1000) {
    return videoCache.playlists;
  }

  // 1) all playlists of the channel + the auto-generated "Videos" (uploads)
  //    playlist, which playlists.list does NOT include
  const playlists = [
    { id: YOUTUBE_UPLOADS_PLAYLIST, title: "Videos", isUploads: true },
  ];
  let pageToken = "";
  do {
    const data = await fetchPlaylists(pageToken);
    for (const p of data.items || []) {
      const title = ((p.snippet && p.snippet.title) || "").trim();
      if (!title || title === "Private playlist" || title === "Deleted playlist") continue;
      if (p.id === YOUTUBE_UPLOADS_PLAYLIST) continue; // already added above
      playlists.push({ id: p.id, title });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  // 2) items of every playlist (skip a playlist if its fetch fails)
  const allVideos = [];
  for (const pl of playlists) {
    const videos = [];
    try {
      let token = "";
      do {
        const data = await fetchPlaylistItems(pl.id, token);
        for (const item of data.items || []) {
          const s = item.snippet || {};
          const title = (s.title || "").trim();
          const id = s.resourceId && s.resourceId.videoId;
          if (!id || title === "Private video" || title === "Deleted video") continue;
          videos.push({ id, title, published: s.publishedAt || "", thumbnail: pickThumb(s.thumbnails) });
        }
        token = data.nextPageToken || "";
      } while (token);
    } catch (e) {
      // one broken playlist shouldn't kill the whole page
    }
    // uploads playlist is oldest-first → newest first
    if (pl.isUploads) {
      videos.sort((a, b) => new Date(b.published) - new Date(a.published));
    }
    pl.videos = videos;
    allVideos.push(...videos);
  }

  // 3) view counts for all unique videos (videos.list accepts up to 50 ids)
  const uniqueIds = [...new Set(allVideos.map((v) => v.id))];
  const views = {};
  for (let i = 0; i < uniqueIds.length; i += 50) {
    Object.assign(views, await fetchVideoStats(uniqueIds.slice(i, i + 50)));
  }
  for (const pl of playlists) {
    for (const v of pl.videos) v.views = views[v.id] || "";
  }

  videoCache = { at: now, playlists };
  return playlists;
}

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Look up a registered user in Supabase (id, password hash, display fields)
async function findSupabaseUser(username) {
  try {
    const res = await fetch(
      `${SUPABASE_TABLE}?userId=eq.${encodeURIComponent(username)}&select=userId,password,displayName,pictureUrl`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

// Test users — like the article, the password is "mecallapi" for all of them
export const users = [
  {
    username: "karn.yong@mecallapi.com",
    password: "mecallapi",
    fname: "Karn",
    lname: "Yongsiriwit",
    avatar: "/user.svg",
  },
  {
    username: "somsri.jaidee@mecallapi.com",
    password: "mecallapi",
    fname: "Somsri",
    lname: "Jaidee",
    avatar: "/user.svg",
  },
  {
    username: "somchai.jaidee@mecallapi.com",
    password: "mecallapi",
    fname: "Somchai",
    lname: "Jaidee",
    avatar: "/user.svg",
  },
];

// --- Minimal HS256 JWT (same structure as the accessToken from MeCallAPI) ---
function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signToken(username) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    username: username,
    iat: Math.floor(Date.now() / 1000),
  };
  const data =
    base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return data + "." + signature;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const data = parts[0] + "." + parts[1];
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (expected !== parts[2]) return null;
  return JSON.parse(Buffer.from(parts[1], "base64url").toString());
}

// Handle one API request and return { statusCode, json }
// Same request/response format as MeCallAPI.
export async function handleRequest(method, pathname, body, authHeader) {
  // POST /api/login
  if (pathname === "/api/login" && method === "POST") {
    const user = users.find(
      (u) => u.username === body.username && u.password === body.password
    );
    if (user) {
      return {
        statusCode: 200,
        json: {
          status: "ok",
          message: "Logged in",
          accessToken: signToken(user.username),
        },
      };
    }

    // Also accept users registered via Supabase (password stored as SHA-256)
    const registered = await findSupabaseUser(body.username);
    if (
      registered &&
      registered.password &&
      registered.password === sha256Hex(body.password || "")
    ) {
      return {
        statusCode: 200,
        json: {
          status: "ok",
          message: "Logged in",
          accessToken: signToken(registered.userId),
        },
      };
    }

    return {
      statusCode: 200,
      json: { status: "error", message: "Invalid username or password" },
    };
  }

  // GET /api/videos — ALL public YouTube playlists of the channel, with videos
  if (pathname === "/api/videos" && method === "GET") {
    try {
      const playlists = await fetchAllYouTubePlaylists();
      return { statusCode: 200, json: { status: "ok", playlists } };
    } catch (e) {
      return {
        statusCode: 502,
        json: {
          status: "error",
          message: e.message && e.message.includes("key")
            ? "YouTube API key ยังไม่ได้ตั้งค่า"
            : `Cannot fetch videos: ${e.message}`,
        },
      };
    }
  }

  // GET /api/auth/user — needs Authorization: Bearer <accessToken>
  if (pathname === "/api/auth/user" && method === "GET") {
    const auth = authHeader || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const payload = verifyToken(token);
    const user = payload && users.find((u) => u.username === payload.username);
    if (user) {
      return {
        statusCode: 200,
        json: {
          status: "ok",
          user: {
            username: user.username,
            fname: user.fname,
            lname: user.lname,
            avatar: user.avatar,
          },
        },
      };
    }

    // Registered (Supabase) users
    const registered =
      payload && (await findSupabaseUser(payload.username));
    if (registered) {
      return {
        statusCode: 200,
        json: {
          status: "ok",
          user: {
            username: registered.userId,
            fname: registered.displayName,
            lname: "",
            avatar: registered.pictureUrl || "/user.svg",
          },
        },
      };
    }

    return {
      statusCode: 401,
      json: { status: "error", message: "Unauthorized" },
    };
  }

  return {
    statusCode: 404,
    json: { status: "error", message: "Not found" },
  };
}
