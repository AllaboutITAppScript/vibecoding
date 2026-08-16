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

// ── Supabase (PostgREST) — registration data ────────────────────────
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_KEY if needed.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://jwugmipfeuegtuscmvbv.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  "sb_publishable_nLNd7tODmYdO43F6dgdrSw_jppTyHMF";
const SUPABASE_TABLE = `${SUPABASE_URL}/rest/v1/user_profiles`;

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
    displayName,
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
