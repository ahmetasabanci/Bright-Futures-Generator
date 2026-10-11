export interface ServerConfig {
  explanationProvider: "gemini" | "claude" | null;
  visionEnabled: boolean;
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }
  return response.json();
}

export async function fetchExplanation(sector: string, technology: string): Promise<string> {
  try {
    const response = await fetch("/api/predict/explain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sector, technology }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.text || "No explanation could be generated at this time.";
  } catch (error) {
    console.error("Client fetchExplanation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    throw new Error(`Failed to connect to the future-seeing core: ${errorMessage}`);
  }
}

export async function generateVisionImage(sector: string, technology: string): Promise<string> {
  try {
    const response = await fetch("/api/predict/vision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sector, technology }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.image) {
      throw new Error("No image data received from the prediction core.");
    }
    return data.image;
  } catch (error) {
    console.error("Client generateVisionImage Error:", error);
    throw error;
  }
}
