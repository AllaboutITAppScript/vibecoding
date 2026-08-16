// Local mock of MeCallAPI (https://www.mecallapi.com) from the article
// "ใช้แค่ HTML, CSS, JavaScript และ API ก็ทำหน้าเว็บ Login ได้"
//
// Zero dependencies — only Node.js built-ins (http, fs, path, crypto).
// The real MeCallAPI.com domain is currently offline, so this server
// mimics its two endpoints with the same request/response format.
//
// Run with:
//   node server.js
// Then open http://localhost:3000/login.html
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 3000;
const SECRET = "mecallapi-mock-secret";

// Test users — like the article, the password is "mecallapi" for all of them
const users = [
  {
    username: "karn.yong@mecallapi.com",
    password: "mecallapi",
    fname: "Karn",
    lname: "Yongsiriwit",
    avatar: "http://localhost:3000/user.svg",
  },
  {
    username: "somsri.jaidee@mecallapi.com",
    password: "mecallapi",
    fname: "Somsri",
    lname: "Jaidee",
    avatar: "http://localhost:3000/user.svg",
  },
  {
    username: "somchai.jaidee@mecallapi.com",
    password: "mecallapi",
    fname: "Somchai",
    lname: "Jaidee",
    avatar: "http://localhost:3000/user.svg",
  },
];

// --- Minimal HS256 JWT (same structure as the accessToken from MeCallAPI) ---
function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signToken(username) {
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

function verifyToken(token) {
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

// --- Helpers ---
function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve({});
      }
    });
  });
}

// --- Static file serving (so the whole app runs from one URL) ---
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

function serveStatic(pathname, res) {
  let filePath = pathname;
  filePath = path.normalize(path.join(ROOT, filePath));
  // Prevent path traversal outside the project folder
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 404, { status: "error", message: "Not found" });
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { status: "error", message: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

// --- Server ---
const server = http.createServer(async (req, res) => {
  // CORS so the pages also work when opened directly from disk (file://)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // POST /api/login — same format as MeCallAPI
  if (url.pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    const user = users.find(
      (u) => u.username === body.username && u.password === body.password
    );
    if (user) {
      sendJson(res, 200, {
        status: "ok",
        message: "Logged in",
        accessToken: signToken(user.username),
      });
    } else {
      sendJson(res, 200, {
        status: "error",
        message: "Invalid username or password",
      });
    }
    return;
  }

  // GET /api/auth/user — needs Authorization: Bearer <accessToken>
  if (url.pathname === "/api/auth/user" && req.method === "GET") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const payload = verifyToken(token);
    const user = payload && users.find((u) => u.username === payload.username);
    if (user) {
      sendJson(res, 200, {
        status: "ok",
        user: {
          username: user.username,
          fname: user.fname,
          lname: user.lname,
          avatar: user.avatar,
        },
      });
    } else {
      sendJson(res, 401, { status: "error", message: "Unauthorized" });
    }
    return;
  }

  // Anything else — serve the static files (logo.svg, user.svg, ...)
  serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}/api/login`);
  console.log("React app: run `npm run dev` then open http://localhost:5173/login");
  console.log("Test user: karn.yong@mecallapi.com / mecallapi");
});
