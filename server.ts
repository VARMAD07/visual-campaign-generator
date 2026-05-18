import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/campaign/suggest", async (req, res) => {
  const { campaignType, brandDetails, visualStyle } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 creative campaign variations for a ${campaignType}. 
      Brand/Event Details: ${brandDetails}
      Desired Style: ${visualStyle}
      
      For each variation, provide:
      1. A catchy headline.
      2. A brief description of the visual layout.
      3. A prompt for an AI image generator to create the background or key visual.
      4. A suggested color palette (hex codes).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              description: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              colors: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["headline", "description", "imagePrompt", "colors"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/campaign/generate-image", async (req, res) => {
  const { prompt, aspectRatio = "1:1" } = req.body;

  try {
    // Note: This might require a paid key if using the latest models
    // Using gemini-2.5-flash-image as per skill guidance
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      res.json({ imageUrl: `data:image/png;base64,${part.inlineData.data}` });
    } else {
      res.status(500).json({ error: "No image generated" });
    }
  } catch (error: any) {
    console.error("Image Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
