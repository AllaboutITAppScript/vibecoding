// Local mock of MeCallAPI (https://www.mecallapi.com) from the article
// "ใช้แค่ HTML, CSS, JavaScript และ API ก็ทำหน้าเว็บ Login ได้"
//
// API only — zero dependencies, uses the shared logic in mock-api.js.
// For production, the same logic runs as a Netlify Function
// (see netlify/functions/api.mjs).
//
// Run with:
//   node server.js
// Then in another terminal:  npm run dev  →  http://localhost:5173/login
import http from "http";
import { handleRequest } from "./mock-api.js";

const PORT = process.env.PORT || 3000;

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      // JSON first (our own endpoints), then form-encoded
      // (Google's redirect-mode callback POSTs x-www-form-urlencoded)
      try {
        return resolve(JSON.parse(data));
      } catch (e) {
        /* fall through to form parsing */
      }
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(data);
        return resolve(Object.fromEntries(params.entries()));
      }
      resolve({});
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS so the React app (Vite dev server on :5173) can call the API
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = req.method === "POST" ? await readBody(req) : {};
  const { statusCode, json, headers = {} } = await handleRequest(
    req.method,
    url.pathname,
    body,
    req.headers.authorization
  );

  const responseBody = JSON.stringify(json);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(responseBody),
    ...headers,
  });
  res.end(responseBody);
});

server.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}/api/login`);
  console.log("React app: run `npm run dev` then open http://localhost:5173/login");
  console.log("Test user: karn.yong@mecallapi.com / mecallapi");
});
