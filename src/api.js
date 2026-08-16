// The article uses https://www.mecallapi.com (currently offline).
// API base URL:
//  - local dev  → http://localhost:3000 (run `node server.js`)
//  - production → same origin (/api/* is routed to the Netlify Function)
// Override with VITE_API_URL if needed, e.g. VITE_API_URL=https://... npm run build
export const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:3000");

// POST /api/login — returns { status, message, accessToken }
export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

// GET /api/auth/user — needs Authorization: Bearer <jwt>
// returns { status, user: { username, fname, lname, avatar } }
export async function getCurrentUser(jwt) {
  const res = await fetch(`${API_URL}/api/auth/user`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  return res.json();
}

// GET /api/videos — public YouTube playlists of the channel, each with videos
// returns { status, playlists: [{ id, title, videos: [{ id, title, published, views, thumbnail }] }] }
// 20s timeout so the loading state never hangs forever
const VIDEOS_TIMEOUT_MS = 20000;
export async function getYouTubePlaylists() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VIDEOS_TIMEOUT_MS);
    const res = await fetch(`${API_URL}/api/videos`, { signal: controller.signal });
    clearTimeout(timer);
    return res.json();
  } catch (e) {
    return { status: "error", playlists: [] };
  }
}

// ── Supabase (PostgREST) — registration data ────────────────────────
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_KEY if needed.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://jwugmipfeuegtuscmvbv.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  "sb_publishable_nLNd7tODmYdO43F6dgdrSw_jppTyHMF";
const SUPABASE_TABLE = `${SUPABASE_URL}/rest/v1/user_profiles`;

// Repair text that was double-encoded — Thai UTF-8 bytes read as Latin-1
// and stored as UTF-8, e.g. "à¸à¸£à¸à¹à¸" → "ครบเครื่อง".
// Only touches strings made entirely of Latin-1 chars (0x80–0xFF) that form
// valid UTF-8 when re-encoded; correct Thai (U+0E00+) and ASCII stay as-is.
export function repairMojibake(text) {
  if (!text) return text;
  const chars = [...text];
  const cps = chars.map((c) => c.codePointAt(0));
  // Every char must fit in Latin-1 (≤ U+00FF, ASCII included, so spaces
  // and punctuation are allowed) and at least one must be non-ASCII.
  if (!cps.every((cp) => cp <= 0xff)) return text; // has real Thai/multibyte → fine
  if (!cps.some((cp) => cp >= 0x80)) return text; // pure ASCII → nothing to fix
  const bytes = new Uint8Array(cps);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (e) {
    return text; // not valid UTF-8 → not mojibake, keep as-is
  }
}

// SHA-256 hash (used for the registration password)
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// POST /rest/v1/user_profiles — save a new registered user profile.
// Fields map to the existing `user_profiles` columns:
//   userId, displayName, pictureUrl, statusMessage, password (SHA-256 hash)
// (status="follow", role="user", ai_enabled/ai_status=true by default)
// returns { status, message, data? }
export async function registerUser({ userId, displayName, pictureUrl, statusMessage, password }) {
  const payload = {
    userId,
    displayName: repairMojibake(displayName),
    pictureUrl: pictureUrl || "",
    statusMessage: statusMessage || "",
    status: "follow",
    role: "user",
    ai_enabled: true,
    ai_status: true,
    updated_at: new Date().toISOString(),
  };
  // Store only the hash — never the plain-text password
  if (password) {
    payload.password = await sha256Hex(password);
  }
  const res = await fetch(SUPABASE_TABLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = await res.json();
    return { status: "ok", message: "ลงทะเบียนสำเร็จ", data };
  }

  // Surface the PostgREST error message (e.g. duplicate userId)
  let message = "ลงทะเบียนไม่สำเร็จ";
  try {
    const err = await res.json();
    if (err.message) message = err.message;
  } catch (e) {
    /* ignore */
  }
  return { status: "error", message };
}

// Google Sign-In — save the Google profile into user_profiles.
// If the userId already exists, keep the row; otherwise register it.
// returns { status, message, data? }
export async function saveGoogleUser({ userId, displayName, pictureUrl }) {
  try {
    const check = await fetch(
      `${SUPABASE_TABLE}?userId=eq.${encodeURIComponent(userId)}&select=id`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const rows = check.ok ? await check.json() : [];
    if (Array.isArray(rows) && rows.length > 0) {
      return { status: "ok", message: "เข้าสู่ระบบด้วย Google สำเร็จ", data: rows[0] };
    }
    const result = await registerUser({ userId, displayName, pictureUrl, statusMessage: "" });
    if (result.status === "ok") {
      return { status: "ok", message: "เข้าสู่ระบบด้วย Google สำเร็จ", data: result.data };
    }
    return result;
  } catch (e) {
    return { status: "error", message: "เชื่อมต่อ Supabase ไม่สำเร็จ" };
  }
}
