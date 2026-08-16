# Login Page with HTML, CSS, JavaScript and an API

Code from the article: **"ใช้แค่ HTML, CSS, JavaScript และ API ก็ทำหน้าเว็บ Login ได้ พื้นฐานที่นักพัฒนาเว็บต้องรู้"** by [Karn Yongsiriwit](https://karnyong.medium.com/) (English version: [Let's Build a Website Login Page with HTML, CSS, JavaScript and an External API](https://javascript.plainenglish.io/lets-build-a-website-login-page-with-html-css-javascript-and-an-external-api-a083942f797d)).

A basic login page built with only HTML, CSS, JavaScript (Bootstrap 5 + SweetAlert2) that authenticates using a JWT-based API.

> **Note:** the article uses the external API [MeCallAPI.com](https://www.mecallapi.com/), but that domain is currently offline. This project includes `server.js`, a tiny zero-dependency Node.js server that mimics MeCallAPI's endpoints with the exact same request/response format — so the whole flow (login → profile → logout) works on your machine.

## Files

| File          | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `login.html`  | Login form page (email + password + Login button)                    |
| `login.css`   | Extra styling on top of Bootstrap for the login page                 |
| `login.js`    | Calls `POST /api/login`, saves the JWT in `localStorage`, redirects  |
| `index.html`  | Page for the logged-in user (protected — requires a JWT)             |
| `index.css`   | Extra styling for the navbar                                          |
| `index.js`    | Calls `GET /api/auth/user` with the Bearer token, handles logout      |
| `server.js`   | Local mock of the MeCallAPI login/auth endpoints + static file server |
| `logo.svg`    | Placeholder logo (the article uses `logo.png` — replace it)           |
| `user.svg`    | Placeholder avatar (the article uses `user.png` — replace it)         |

## How to run

```bash
node server.js
```

Then open **http://localhost:3000/login.html** in your browser.

Alternatively, open `login.html` directly from disk (`file://`) — the mock server sends CORS headers, so it works either way.

### Test credentials

```
username: karn.yong@mecallapi.com
password: mecallapi
```

The password `mecallapi` is the same for all users on the mock server
(`somsri.jaidee@mecallapi.com` and `somchai.jaidee@mecallapi.com` also work),
just like the article.

## How it works

1. `login.html` → clicking **Login** calls `login()` in `login.js`.
2. `login.js` POSTs `{ username, password }` to `http://localhost:3000/api/login`.
   - Success → `accessToken` (a real HS256 JWT, signed by `server.js`) is saved to `localStorage` under `jwt`, a success popup is shown, then the browser goes to `index.html`.
   - Failure → an error popup is shown.
3. `index.html` → `index.js` checks for `jwt` in `localStorage`; if missing, it redirects back to `login.html`.
4. `index.js` calls `GET /api/auth/user` with header `Authorization: Bearer <jwt>` and displays the logged-in user's name and avatar.
5. **Logout** removes `jwt` from `localStorage` and returns to `login.html`.

## Differences from the article (small fixes)

- API URL changed from `https://www.mecallapi.com` to `http://localhost:3000` (the original API is offline). The rest of the JavaScript is unchanged from the article.
- `logo.png`/`user.png` → `logo.svg`/`user.svg` placeholder images so the pages render without extra binary assets.
- Fixed the `label for` attributes on the login form (they didn't match the input ids in the original) and the unbalanced `<p>` tag around the freepik attribution.
