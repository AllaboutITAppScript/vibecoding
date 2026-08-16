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

function parseBody(raw, contentType) {
  if (!raw) return {};
  // JSON first (our own endpoints)
  try {
    return JSON.parse(raw);
  } catch (e) {
    /* fall through */
  }
  // Form-encoded — Google's redirect-mode callback POSTs this way
  if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return {};
}

export async function handler(event) {
  const body = parseBody(event.body, event.headers ? event.headers["content-type"] : "");

  const { statusCode, json, headers = {} } = await handleRequest(
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
      ...headers,
    },
    body: JSON.stringify(json),
  };
}
