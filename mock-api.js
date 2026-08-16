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
