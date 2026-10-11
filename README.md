# Bright Futures Generator

An optimistic future-casting toy. Each prediction pairs a random industry sector with a random emerging technology:

> The future of **Public Transportation** will be bright because of **Next-gen Solid State Batteries**.

From there you can:

- **Consult Why?** – ask Gemini for a short argument for why the pairing creates a better future. Every request generates a fresh explanation.
- **Recast** – roll a new sector and technology.
- **Vision** – generate a 16:9 AI image for the prediction and download it as a 1920×1080 card with the prediction and explanation on it.
- **Share** – share the prediction and explanation through the system share sheet, or copy them to the clipboard.

A [Tuhaf Studio](https://tuhaf.studio) experiment.

## Tech stack

- **Frontend:** React 19, Tailwind CSS v4 (built with Vite), self-hosted fonts via Fontsource
- **Backend:** Express 5. It serves the app and proxies requests to the Gemini API, so the API key never reaches the browser.
- **AI:** Google Gemini via `@google/genai`. Explanations use `gemini-3.5-flash`; images use `gemini-2.5-flash-image`.

## Running locally

**Prerequisites:** Node.js 20 or newer and a [Gemini API key](https://aistudio.google.com/apikey).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env.local` file in the project root with your key:

   ```sh
   GEMINI_API_KEY=your-key-here
   ```

3. Start the dev server, which runs Express with Vite in middleware mode and hot reload:

   ```sh
   npm run dev
   ```

4. Open <http://localhost:3000>.

`npm run dev` doesn't read `.env.local` automatically. Load it with Node's env-file support:

```sh
npx tsx --env-file=.env.local server.ts
```

You can also export `GEMINI_API_KEY` in your shell before running `npm run dev`.

## Production build

```sh
npm run build   # builds the client into dist/ and bundles the server into dist/server.cjs
NODE_ENV=production GEMINI_API_KEY=your-key-here npm start
```

## Configuration

| Variable         | Required | Description |
| ---------------- | -------- | ----------- |
| `GEMINI_API_KEY` | Yes      | Gemini API key. Used only on the server. |
| `PORT`           | No       | Port to listen on. Defaults to `3000`. |
| `NODE_ENV`       | No       | Set to `production` to serve the built `dist/` instead of running Vite. |
| `TRUST_PROXY`    | No       | Express `trust proxy` setting, e.g. `1` when running behind one load balancer. Rate limiting is per client IP, so set this behind a proxy. Otherwise every visitor shares one IP and one limit. Cloud Run is detected automatically. |

## Security

All Gemini calls happen on the server. The two API endpoints, `POST /api/predict/explain` and `POST /api/predict/vision`, are protected by:

- **An allow-list.** `sector` and `technology` must come from the lists in `constants.ts`, so no user-supplied text reaches the prompts.
- **Rate limiting per IP.** The limits are 30 explanations and 10 images per 10 minutes.
- **A same-origin check.** It filters casual misuse from other websites. It isn't an authentication boundary.
- **Generic error messages.** Upstream errors are logged on the server, not returned to the client.

In production the server also sends a strict Content-Security-Policy. All scripts, styles and fonts are self-hosted, so the page loads nothing from third parties.

## Project structure

```
server.ts                   Express server, API endpoints, security middleware
App.tsx                     Main UI and the Vision card renderer (canvas)
services/geminiService.ts   Client-side calls to the server API
constants.ts                Sector and technology lists (also the server allow-list)
components/                 Presentational components
index.css                   Tailwind entry point, fonts, and custom utilities
```

To add new sectors or technologies, edit `constants.ts`. The server picks up the change automatically.
