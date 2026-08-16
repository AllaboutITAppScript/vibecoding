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

// Admin account — can view all registered users and block/unblock them
const ADMIN_USERNAME = "jhokhao@gmail.com";
const GOOGLE_CLIENT_ID =
  "548978955126-p63ji2gjrq95mvpqrujeslaud85bhqqv.apps.googleusercontent.com";

function isAdmin(username) {
  return username === ADMIN_USERNAME;
}

// Verify the Authorization header and return the authenticated username
// (or null). Accepts either our HS256 JWT (email/password login) or a
// Google ID token verified against Google's tokeninfo endpoint.
async function authedUsername(authHeader) {
  const auth = authHeader || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (payload && payload.username) return payload.username;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const info = await res.json();
    if (info.aud !== GOOGLE_CLIENT_ID || !info.email) return null;
    return info.email;
  } catch (e) {
    return null;
  }
}

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

  // 2) items of every playlist — fetched IN PARALLEL so cold starts stay
  //    well under the Netlify function timeout (10s)
  const results = await Promise.all(
    playlists.map(async (pl) => {
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
      return { pl, videos };
    })
  );
  const allVideos = [];
  for (const { pl, videos } of results) {
    pl.videos = videos;
    allVideos.push(...videos);
  }

  // 3) view counts for all unique videos — batches fetched IN PARALLEL
  const uniqueIds = [...new Set(allVideos.map((v) => v.id))];
  const batches = [];
  for (let i = 0; i < uniqueIds.length; i += 50) {
    batches.push(uniqueIds.slice(i, i + 50));
  }
  const views = Object.assign({}, ...(await Promise.all(batches.map(fetchVideoStats))));
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
      `${SUPABASE_TABLE}?userId=eq.${encodeURIComponent(username)}&select=userId,password,displayName,pictureUrl,blocked`,
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
      if (registered.blocked === true) {
        return {
          statusCode: 200,
          json: {
            status: "error",
            message: "บัญชีของคุณถูกบล็อกแล้ว กรุณาติดต่อผู้ดูแลระบบ",
          },
        };
      }
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
      // Cache-Control lets Netlify's CDN serve this for 10 min — so even a
      // cold function never makes the browser wait for the YouTube calls
      return {
        statusCode: 200,
        headers: { "Cache-Control": "public, max-age=600" },
        json: { status: "ok", playlists },
      };
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

  // GET/POST /api/google-callback — Google redirect-mode callback.
  // Google POSTs the ID token here (form_post); we bounce it back to the
  // SPA as /login?credential=... which the login page consumes.
  // (Netlify's SPA fallback can't serve POST bodies, so we need a real
  // endpoint — this avoids the mobile popup entirely.)
  if (pathname === "/api/google-callback") {
    const credential = (body && body.credential) || "";
    if (!credential) {
      return {
        statusCode: 400,
        json: { status: "error", message: "missing credential" },
      };
    }
    const appOrigin =
      process.env.SITE_URL || "https://vibecodingex.netlify.app";
    return {
      statusCode: 302,
      headers: {
        Location: `${appOrigin}/login?credential=${encodeURIComponent(credential)}`,
      },
      json: { status: "ok" },
    };
  }

  // POST /api/online — heartbeat: records last_seen_at for the caller and
  // returns how many users are online right now (active in the last 5 min).
  if (pathname === "/api/online" && method === "POST") {
    const username = await authedUsername(authHeader);
    if (!username) {
      return {
        statusCode: 401,
        json: { status: "error", message: "Unauthorized" },
      };
    }
    const now = new Date();
    // 1) heartbeat — record that this user is active
    try {
      await fetch(
        `${SUPABASE_TABLE}?userId=eq.${encodeURIComponent(username)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${
              process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY
            }`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ last_seen_at: now.toISOString() }),
        }
      );
    } catch (e) {
      // keep going — the count below is what matters
    }

    // 2) count users active in the last 5 minutes
    const since = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    let online = null;
    try {
      const res = await fetch(
        `${SUPABASE_TABLE}?select=id&last_seen_at=gte.${encodeURIComponent(
          since
        )}&limit=1000`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "count=exact",
          },
        }
      );
      if (res.ok) {
        const range = res.headers.get("content-range") || "";
        const m = range.match(/\/(\d+)$/);
        online = m ? Number(m[1]) : (await res.json()).length;
      }
    } catch (e) {
      // ignore — online stays null → error status
    }
    return {
      statusCode: 200,
      json: { status: online === null ? "error" : "ok", online: online ?? 0 },
    };
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

  // GET /api/admin/users — list every registered user (admin only)
  if (pathname === "/api/admin/users" && method === "GET") {
    const username = await authedUsername(authHeader);
    if (!username || !isAdmin(username)) {
      return {
        statusCode: 403,
        json: { status: "error", message: "ไม่มีสิทธิ์เข้าถึง" },
      };
    }
    try {
      const res = await fetch(
        `${SUPABASE_TABLE}?select=id,userId,displayName,pictureUrl,blocked,created_at&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      if (!res.ok) {
        return {
          statusCode: 502,
          json: { status: "error", message: "อ่านข้อมูลผู้ใช้ไม่สำเร็จ" },
        };
      }
      const rows = await res.json();
      const users = (Array.isArray(rows) ? rows : []).map((r) => ({
        id: r.id,
        userId: r.userId,
        displayName: r.displayName,
        pictureUrl: r.pictureUrl,
        blocked: r.blocked === true,
        created_at: r.created_at,
      }));
      return { statusCode: 200, json: { status: "ok", users } };
    } catch (e) {
      return {
        statusCode: 502,
        json: { status: "error", message: "อ่านข้อมูลผู้ใช้ไม่สำเร็จ" },
      };
    }
  }

  // POST /api/admin/users/:id/block — block or unblock a user (admin only)
  const blockMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/block$/);
  if (blockMatch && method === "POST") {
    const username = await authedUsername(authHeader);
    if (!username || !isAdmin(username)) {
      return {
        statusCode: 403,
        json: { status: "error", message: "ไม่มีสิทธิ์เข้าถึง" },
      };
    }
    const id = blockMatch[1];
    const blocked = body.blocked === true;
    try {
      // Read the row first so we can protect the admin account itself
      const check = await fetch(
        `${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}&select=userId`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const rows = check.ok ? await check.json() : [];
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row) {
        return { statusCode: 404, json: { status: "error", message: "ไม่พบผู้ใช้" } };
      }
      if (isAdmin(row.userId)) {
        return {
          statusCode: 403,
          json: { status: "error", message: "ไม่สามารถบล็อกบัญชีผู้ดูแลได้" },
        };
      }
      const res = await fetch(
        `${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${
              process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY
            }`,
            Prefer: "return=representation",
          },
          body: JSON.stringify({ blocked }),
        }
      );
      if (!res.ok) {
        return {
          statusCode: 502,
          json: { status: "error", message: "อัปเดตสถานะไม่สำเร็จ" },
        };
      }
      return { statusCode: 200, json: { status: "ok", blocked } };
    } catch (e) {
      return {
        statusCode: 502,
        json: { status: "error", message: "อัปเดตสถานะไม่สำเร็จ" },
      };
    }
  }

  return {
    statusCode: 404,
    json: { status: "error", message: "Not found" },
  };
}
