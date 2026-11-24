# RealityStore — AR try-on store (static site)

A complete storefront with live camera try-on. Plain HTML/CSS/JS, no build step.

## Run locally
- **Windows:** double-click `start-mirra.bat`. It starts a small server with built-in PowerShell and opens http://localhost:8080 in your browser. Keep the black window open; close it to stop.
- **Mac / Linux:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080.

The camera works on localhost because browsers treat it as a secure address.

## Put it online (camera needs HTTPS)
- **Vercel:** drag this folder into vercel.com/new (or `vercel deploy`), framework "Other", no build command.
- **Netlify:** drag the folder onto app.netlify.com/drop.
Any HTTPS static host works.

## Where things are
- `css/style.css` — the glossy design system. Change the three brand colours at the top (`--ink`, `--violet`, `--volt`).
- `js/data.js` — product catalogue + procedural product artwork.
- `js/store.js` — cart, wishlist, orders, account, saved looks (browser storage — demo only, no backend yet).
- `js/views/*` — one file per page. `js/app.js` — router (hash links like `#shop-face`).
- `js/ar/` — try-on engine: `engine.js` (camera + MediaPipe tracking), `face3d.js` (3D hats & glasses), `draw2d.js` (gloves, jackets, shoes, socks).
- `vendor/` — three.js, MediaPipe Tasks Vision (wasm) and the face / hand / pose models, served from your own host.

## Not yet connected (needed for a real launch)
Payments gateway, a real database + staff login for the admin panel, email notifications, and real product photos / 3D files.
