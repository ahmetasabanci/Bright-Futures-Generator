# Bright Futures Generator

An optimistic future-casting toy. Each prediction pairs a random industry sector with a random emerging technology:

> The future of **Public Transportation** will be bright because of **Next-gen Solid State Batteries**.

From there you can:

- **Consult Why?** – ask Gemini or Claude for a short argument for why the pairing creates a better future. Every request generates a fresh explanation.
- **Recast** – roll a new sector and technology.
- **Vision** – generate a 16:9 AI image for the prediction with Gemini, and download it as a 1920×1080 card with the prediction and explanation on it.
- **Share** – share the prediction and explanation through the system share sheet, or copy them to the clipboard.

A [Tuhaf Studio](https://tuhaf.studio) experiment.

## Tech stack

- **Frontend:** React 19, Tailwind CSS v4 (built with Vite), self-hosted fonts via Fontsource
- **Backend:** Express 5. It serves the app and proxies requests to the AI providers, so API keys never reach the browser.
- **AI:**
  - Explanations come from either Google Gemini (`gemini-3.5-flash` via `@google/genai`) or Anthropic Claude (`claude-opus-5-5` by default, via `@anthropic-ai/sdk`).
  - Images always come from Gemini (`gemini-2.5-flash-image`), because Claude doesn't generate images.

## Running locally

**Prerequisites:** Node.js 20 or newer, plus a [Gemini API key](https://aistudio.google.com/apikey), a [Claude API key](https://platform.claude.com/settings/keys), or both. With only a Claude key, explanations work but the Vision button is hidden.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env.local` file in the project root with your key or keys:

   ```sh
   GEMINI_API_KEY=your-gemini-key
   ANTHROPIC_API_KEY=your-claude-key
   EXPLANATION_PROVIDER=claude   # optional, see Configuration
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

You can also export the variables in your shell before running `npm run dev`.

## Production build

```sh
npm run build   # builds the client into dist/ and bundles the server into dist/server.cjs
NODE_ENV=production GEMINI_API_KEY=your-key-here npm start
```

## Configuration

| Variable         | Required | Description |
| ---------------- | -------- | ----------- |
| `GEMINI_API_KEY` | One of the two keys | Gemini API key. Required for Vision images, and for explanations when Gemini is the provider. Used only on the server. |
| `ANTHROPIC_API_KEY` | One of the two keys | Claude API key, used for explanations when Claude is the provider. Used only on the server. |
| `EXPLANATION_PROVIDER` | No | `claude` or `gemini`. If unset, the server uses whichever key is configured, preferring Gemini when both are. |
| `CLAUDE_MODEL` | No | Claude model for explanations. Defaults to `claude-opus-5-5`. |
| `PORT`           | No       | Port to listen on. Defaults to `3000`. |
| `NODE_ENV`       | No       | Set to `production` to serve the built `dist/` instead of running Vite. |
| `TRUST_PROXY`    | No       | Express `trust proxy` setting, e.g. `1` when running behind one load balancer. Rate limiting is per client IP, so set this behind a proxy. Otherwise every visitor shares one IP and one limit. Cloud Run is detected automatically. |

## Security

All AI calls happen on the server. The two API endpoints, `POST /api/predict/explain` and `POST /api/predict/vision`, are protected by:

- **An allow-list.** `sector` and `technology` must come from the lists in `constants.ts`, so no user-supplied text reaches the prompts.
- **Rate limiting per IP.** The limits are 30 explanations and 10 images per 10 minutes.
- **A same-origin check.** It filters casual misuse from other websites. It isn't an authentication boundary.
- **Generic error messages.** Upstream errors are logged on the server, not returned to the client.

In production the server also sends a strict Content-Security-Policy. All scripts, styles and fonts are self-hosted, so the page loads nothing from third parties.

## Project structure

```
server.ts                   Express server, API endpoints, security middleware
server/explanation.ts       Explanation providers (Gemini and Claude)
App.tsx                     Main UI and the Vision card renderer (canvas)
services/apiService.ts      Client-side calls to the server API
constants.ts                Sector and technology lists (also the server allow-list)
components/                 Presentational components
index.css                   Tailwind entry point, fonts, and custom utilities
```

To add new sectors or technologies, edit `constants.ts`. The server picks up the change automatically.
