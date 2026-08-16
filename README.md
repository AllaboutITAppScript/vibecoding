# Login Page with React and an API

React version of the tutorial: **"ใช้แค่ HTML, CSS, JavaScript และ API ก็ทำหน้าเว็บ Login ได้ พื้นฐานที่นักพัฒนาเว็บต้องรู้"** by [Karn Yongsiriwit](https://karnyong.medium.com/) (English version: [Let's Build a Website Login Page with HTML, CSS, JavaScript and an External API](https://javascript.plainenglish.io/lets-build-a-website-login-page-with-html-css-javascript-and-an-external-api-a083942f797d)).

The original article builds the login page with plain HTML/CSS/JavaScript. This version reimplements the same flow in **React** (Vite + React Router), keeping the same API, the same pages, and the same Bootstrap 5 + SweetAlert2 styling.

> **Note:** the article uses the external API [MeCallAPI.com](https://www.mecallapi.com/), but that domain is currently offline. This project includes `server.js`, a tiny zero-dependency Node.js server that mimics MeCallAPI's endpoints with the exact same request/response format — so the whole flow (login → profile → logout) works on your machine.

## Tech stack

- React 19 + Vite
- React Router (routes: `/login` and protected `/`)
- Bootstrap 5 + SweetAlert2 (via CDN, same as the article)
- `server.js` — local mock API (zero-dependency Node.js)

## How to run (local dev)

Terminal 1 — start the mock API:

```bash
node server.js
```

Terminal 2 — start the React app:

```bash
npm install   # first time only
npm run dev
```

Then open **http://localhost:5173/login** in your browser.

## Deploy to Netlify (live site)

The API is not just a local server — the same logic also runs as a
[Netlify Function](netlify/functions/api.mjs), and `netlify.toml` wires up
both the `/api/*` endpoints and the SPA fallback. In production the front-end
calls the API on the **same origin** (`src/api.js`), so everything works from
one domain.

### Option 1 — Netlify Drop (drag & drop)

1. `npm run build`
2. Drag the `dist/` folder onto https://app.netlify.com/drop

> Note: drag & drop deploys **do not** run Netlify Functions. Use Option 2
> (GitHub) for the live API to work.

### Option 2 — GitHub (recommended, full API support)

1. Push this repo to GitHub (already done: https://github.com/AllaboutITAppScript/vibecoding)
2. On Netlify: **Add new site → Import an existing project → GitHub**
3. Pick the `vibecoding` repo — Netlify reads `netlify.toml`
   (build command `npm run build`, publish `dist`) and deploys the function automatically
4. Your site is live at `https://<site-name>.netlify.app/login`

To change the site name, go to **Site configuration → General → Change site name**.

The deployed front-end works with the deployed API out of the box. For a
custom API URL instead, build with `VITE_API_URL=https://your-api.example npm run build`.

### Test credentials

```
username: karn.yong@mecallapi.com
password: mecallapi
```

The password `mecallapi` is the same for all users on the mock server
(`somsri.jaidee@mecallapi.com` and `somchai.jaidee@mecallapi.com` also work),
just like the article.

## Project structure

| File                  | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `index.html`          | Vite entry (Bootstrap 5 + SweetAlert2 CDNs)                                 |
| `src/main.jsx`        | React entry point + BrowserRouter                                           |
| `src/App.jsx`         | Routes: `/login` and protected `/` (profile)                                |
| `src/pages/Login.jsx` | Login form → `POST /api/login` → saves JWT to `localStorage`                |
| `src/pages/Profile.jsx` | Protected page → `GET /api/auth/user` with Bearer token, Logout           |
| `src/api.js`          | API client (same-origin in prod, localhost:3000 in dev)                     |
| `src/index.css`       | Styles (from the article's login.css + index.css)                           |
| `mock-api.js`         | Shared API logic (users + JWT + request handler)                            |
| `server.js`           | Local API server (dev only)                                                 |
| `netlify/functions/api.mjs` | Netlify Function version of the API (production)                       |
| `netlify.toml`        | Netlify build config + `/api/*` and SPA redirects                           |
| `public/logo.svg`, `public/user.svg` | Placeholder images copied into the build                           |

## How it works

1. **Login** (`/login`) → `handleSubmit` calls `login()` in `src/api.js` which POSTs `{ username, password }` to `http://localhost:3000/api/login`.
   - Success → `accessToken` (a real HS256 JWT) is saved to `localStorage` under `jwt`, a success popup is shown, then React Router navigates to `/`.
   - Failure → an error popup is shown.
2. **Profile** (`/`) → if `jwt` is missing from `localStorage`, the page redirects to `/login`. Otherwise it calls `GET /api/auth/user` with header `Authorization: Bearer <jwt>` and displays the user's name and avatar.
3. **Logout** removes `jwt` from `localStorage` and navigates back to `/login`.

## API endpoints (from `server.js`)

| Method | URL                        | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| POST   | `/api/login`               | Body: `{ username, password }` → returns `{ status, message, accessToken }` |
| GET    | `/api/auth/user`           | Header: `Authorization: Bearer <jwt>` → returns `{ status, user }` |

The original vanilla HTML/CSS/JS version of this project is preserved in git
history (commit `51f4771`).
