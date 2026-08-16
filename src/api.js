// The article uses https://www.mecallapi.com (currently offline),
// so we call the local mock server (see server.js in the project root).
export const API_URL = "http://localhost:3000";

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
