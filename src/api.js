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
