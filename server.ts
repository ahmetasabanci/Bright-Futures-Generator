import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { SECTORS, TECHNOLOGIES } from "./constants";
import { createExplainer, resolveExplanationProvider } from "./server/explanation";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

// Rate limiting keys on req.ip, so behind a reverse proxy (e.g. Cloud Run) we must
// trust the proxy's X-Forwarded-For. Only trust it when actually deployed behind one,
// otherwise clients could spoof the header to dodge the limits.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.K_SERVICE ? "1" : undefined);
if (trustProxy !== undefined) {
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Enable JSON body parsing for API requests (payloads are two short strings)
app.use(express.json({ limit: "1kb" }));

// Initialize server-side AI clients. Gemini handles images (and explanations by
// default); Claude can handle explanations when ANTHROPIC_API_KEY is configured.
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;
const explanationProvider = resolveExplanationProvider();
const explain = explanationProvider ? createExplainer(explanationProvider, ai) : null;
console.log(
  `Explanations: ${explanationProvider ?? "not configured"} | Vision images: ${ai ? "gemini" : "disabled (no GEMINI_API_KEY)"}`,
);

// Middleware to protect API routes from cross-site proxy abuse
function restrictToSameOrigin(req: Request, res: Response, next: NextFunction) {
  const secFetchSite = req.headers["sec-fetch-site"];
  const origin = req.get("origin");
  const referer = req.get("referer");
  const host = req.get("host");

  // Modern browsers send Sec-Fetch-Site to identify request origin
  if (secFetchSite) {
    if (secFetchSite !== "same-origin") {
      return res.status(403).json({
        error: "Access Denied. API usage is restricted to the Bright Futures Generator website to prevent key abuse.",
      });
    }
    return next();
  }

  // Fallback origin checking against Host for older browsers
  if (!origin && !referer) {
    return res.status(403).json({ error: "Access Denied. Missing request origin." });
  }
  if (origin) {
    const originHost = origin.replace(/^https?:\/\//, "");
    if (originHost !== host) {
      return res.status(403).json({
        error: "Access Denied. Origin host does not match server host.",
      });
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer, `http://${host}`);
      if (refererUrl.host !== host) {
        return res.status(403).json({
          error: "Access Denied. Request referrer is outside Allowed Web Origin.",
        });
      }
    } catch {
      return res.status(403).json({
        error: "Access Denied. Referrer header failed security checks.",
      });
    }
  }

  next();
}

const SECTOR_SET = new Set(SECTORS);
const TECHNOLOGY_SET = new Set(TECHNOLOGIES);

// Only accept combinations the UI can actually produce. This keeps user-controlled
// text out of the prompts, so the endpoints can't be used as a general Gemini proxy.
function validatePrediction(req: Request, res: Response, next: NextFunction) {
  const { sector, technology } = req.body ?? {};
  if (typeof sector !== "string" || typeof technology !== "string") {
    return res.status(400).json({ error: "Both sector and technology parameters are required." });
  }
  if (!SECTOR_SET.has(sector) || !TECHNOLOGY_SET.has(technology)) {
    return res.status(400).json({ error: "Unknown sector or technology." });
  }
  next();
}

const rateLimitMessage = { error: "Too many requests. Please wait a few minutes and try again." };
const limiterDefaults = {
  windowMs: 10 * 60 * 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: rateLimitMessage,
} as const;
const explainLimiter = rateLimit({ ...limiterDefaults, limit: 30 });
// Image generation is the expensive call, so it gets a tighter budget
const visionLimiter = rateLimit({ ...limiterDefaults, limit: 10 });

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Tells the client which features this deployment supports
app.get("/api/config", (req, res) => {
  res.json({ explanationProvider, visionEnabled: Boolean(ai) });
});

const notConfigured = (res: Response) =>
  res.status(503).json({ error: "This feature is not configured on the server." });

// Server-side explanation casting API
app.post("/api/predict/explain", restrictToSameOrigin, explainLimiter, validatePrediction, async (req, res) => {
  try {
    const { sector, technology } = req.body;

    if (!explain) return notConfigured(res);
    res.json({ text: await explain(sector, technology) });
  } catch (error) {
    console.error("Strategic Argument Generation Error:", error);
    res.status(500).json({
      error: "Failed to connect to the future-seeing core.",
    });
  }
});

// Server-side vision image generation API
app.post("/api/predict/vision", restrictToSameOrigin, visionLimiter, validatePrediction, async (req, res) => {
  try {
    const { sector, technology } = req.body;

    if (!ai) return notConfigured(res);

    const prompt = `A cinematic, high-quality, futuristic visualization of ${technology} transforming ${sector}. 
      Abstract, clean, professional aesthetic, optimistic atmosphere, wide-angle 16:9 composition. 
      No text in the image. Deep blues, vibrant oranges, and soft glow lighting. 8k resolution style.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    let base64Image = null;
    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: "No image data received from vision generation engine." });
    }

    res.json({ image: base64Image });
  } catch (error) {
    console.error("Vision Synthesis Error:", error);
    res.status(500).json({
      error: "Connection failed during vision synthesis.",
    });
  }
});

// Vite middleware configuration for high performance dev and build integration
async function integrateVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    // Everything (scripts, styles, fonts) is self-hosted, so the page only needs its
    // own origin. Inline styles are allowed for React style props; data:/blob: images
    // cover the generated vision image and the background noise texture.
    // frame-ancestors is deliberately not set so the app can still be embedded (AI Studio preview).
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    app.use((req, res, next) => {
      res.setHeader("Content-Security-Policy", contentSecurityPolicy);
      next();
    });
    // Vite emits content-hashed filenames under /assets, so they can be cached forever
    app.use("/assets", express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y" }));
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bright Futures Generator running securely on http://localhost:${PORT}`);
  });
}

integrateVite();
