# Community submissions proof of concept

This is a **deployed proof of concept** at https://santiesteban.github.io/little-ledges-community-poc/. It uses a separate `little-ledges-submissions-poc` D1 database, submission and review Workers, a Turnstile widget, and GitHub OAuth. No Cloudflare Access policy is used. The live creator and player do not use this code. The test gallery contains a disposable example puzzle.

## Flow

The creator shows its submission form only when `VITE_COMMUNITY_SUBMIT_URL` and `VITE_COMMUNITY_TURNSTILE_SITE_KEY` are configured at build time. The public submission Worker validates the puzzle, checks Turnstile, applies approximate per-IP rate limiting, and stores the puzzle as pending. The separate review Worker uses GitHub OAuth with PKCE and a server-side client secret. It checks the signed-in GitHub account’s immutable ID and stores only hashed, 15-minute admin sessions. It lists, approves, or rejects submissions. The GitHub Pages review interface previews and playtests puzzles and exports approved gallery records.

An administrator can add an exported approved gallery record using `node pom/community-poc/publish-export.js PATH_TO_EXPORTED_RECORD`, then review the resulting `pom/creator/public/community-gallery.json` change and publish the static site. The public gallery only loads that file; it has no D1 access. Exported puzzle JSON can also be imported directly into the game. Do not add unreviewed submissions to the public gallery.

## Configuration and security

- Example Wrangler configurations reference the isolated test database. Configure the public submission Worker's `TURNSTILE_SECRET` as a secret, never in source or `VITE_` variables. Configure the Turnstile widget for the creator hostname and action `puzzle_submit`.
- Register a dedicated GitHub OAuth app with the review Worker's `/auth/callback` as its exact callback URL. Put its client secret in a Worker secret; never put it in GitHub Pages, source files, or `VITE_` variables. Configure the Worker with the administrator's immutable GitHub account ID (`1551027`), public client ID, callback URL, and exact admin page URL. The OAuth app requests no additional GitHub scopes.
- The admin page and review API are on different origins. The OAuth callback redirects to the configured GitHub Pages admin page with a short-lived session in its URL fragment. The page immediately removes the fragment and stores the session only for that browser tab. The API stores only a hash of the session and checks it on every request; it does not depend on third-party cookies. Review responses carry `no-store`. Treat all session tokens as secrets.
- CORS is an additional origin restriction, not authorization. Expired and missing sessions must be denied. Protect against XSS because the admin session is available to the admin page's JavaScript. Test the exact deployment origin and callback.
- Workers rate limiting is approximate and local to a Cloudflare location. Monitor quota use and add a stricter abuse strategy if needed. Use a test-only origin/site key for initial end-to-end testing. Keep the public submission UI disabled until the private review boundary has been verified.
- The source puzzle format's checksum is not an authentication mechanism. Unknown puzzle fields are rejected to avoid silently dropping unsupported mechanics. Solvability remains an independent review judgment; valid data does not prove a solution.

## Current validation and outstanding work

Run `node --test pom/community-poc/*.test.js` for isolated validation and authorization checks. The creator build includes gallery and admin pages; without configured public build variables, submission remains hidden. Browser testing covered submission, GitHub admin sign-in, approval, rejection, manual export and publication, gallery download, game import preview, and logged-out denial. Denial for another GitHub user, duplicate handling, and a broader security and operational review remain outstanding. This prototype is not production-ready.

## Administrator sign-in decision

Cloudflare Zero Trust Free checkout requested a payment card, acceptance of terms, and authorization for possible overage charges. The user chose GitHub sign-in as a no-card alternative. The prototype uses OAuth with PKCE and validates the immutable GitHub user ID.
