import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Request, Response, NextFunction } from "express";

const app = express();
const PORT = 3000;

// Enable JSON body parsing for API requests
app.use(express.json());

// Initialize server-side Gemini client securely
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Server-side explanation casting API
app.post("/api/predict/explain", restrictToSameOrigin, async (req, res) => {
  try {
    const { sector, technology } = req.body;
    if (!sector || !technology) {
      return res.status(400).json({ error: "Both sector and technology parameters are required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server configuration missing: GEMINI_API_KEY is not configured.",
      });
    }

    const prompt = `
      The statement is: "The future of ${sector} will be bright because of ${technology}."
      
      Provide a short, optimistic, and compelling 2-3 sentence argument explaining why this combination specifically creates a better future. 
      Use professional but inspiring language. Avoid cliches.
    `;

    // Using gemini-3.5-flash as recommended for general text task in guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
        topP: 0.9,
      },
    });

    res.json({ text: response.text || "No explanation could be generated at this time." });
  } catch (error) {
    console.error("Strategic Argument Generation Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to connect to the future-seeing core.",
    });
  }
});

// Server-side vision image generation API
app.post("/api/predict/vision", restrictToSameOrigin, async (req, res) => {
  try {
    const { sector, technology } = req.body;
    if (!sector || !technology) {
      return res.status(400).json({ error: "Both sector and technology parameters are required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Server configuration missing: GEMINI_API_KEY is not configured.",
      });
    }

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
          base64Image = `data:image/png;base64,${part.inlineData.data}`;
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
      error: error instanceof Error ? error.message : "Connection failed during vision synthesis.",
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
