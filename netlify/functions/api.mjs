// Netlify Function version of the mock API (same logic as server.js,
// shared via mock-api.js). Handles both /api/login and /api/auth/user.
import { handleRequest } from "../../mock-api.js";

function getPathname(event) {
  // When invoked through a redirect proxy (netlify.toml), event.path may
  // contain the original path or the function path — prefer the raw URL.
  if (event.rawUrl) {
    return new URL(event.rawUrl).pathname;
  }
  return event.path || "/";
}

export async function handler(event) {
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      body = {};
    }
  }

  const { statusCode, json } = handleRequest(
    event.httpMethod,
    getPathname(event),
    body,
    event.headers ? event.headers.authorization : undefined
  );

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(json),
  };
}
