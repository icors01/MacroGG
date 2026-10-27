import { requireApiUser } from "../server/api-security.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local for local development
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const input = typeof body?.input === "string" ? body.input.trim() : "";

    if (!input || input.length > 2000) {
      return res.status(400).json({ error: "Enter a food description of 1–2000 characters." });
    }

    if (!await requireApiUser(req, res)) return;

    const apiKey = process.env.GEMINI_API_KEY;
    const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").replace(/^models\//, "");

    if (!apiKey) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY." });
    }

    const systemPrompt =
      "You are a helpful nutrition assistant. Your task is to extract calorie, protein, carbohydrate, and fat information from the user's text. " +
      "If the user provides a food name (e.g., '200g chicken breast'), estimate all four macro values (Calories, Protein, Carbs, Fat). " +
      "If they provide numbers (e.g., 'add 200 calories, 15g protein, 5g fat, 20g carbs'), use those numbers. " +
      "The 'description' field must be a short name for the entry (e.g., 'Chicken Breast & Rice'). " +
      "All values must be numbers (grams for macros, kcal for calories). " +
      "Respond ONLY with the requested JSON format. Do not add any other text or explanation.";

    const schema = {
      type: "OBJECT",
      properties: {
        description: { type: "STRING" },
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbs: { type: "NUMBER" },
        fat: { type: "NUMBER" }
      },
      required: ["description", "calories", "protein", "carbs", "fat"]
    };

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `User input: "${input}"` }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Food estimates are temporarily unavailable. Please try again." });
    }

    const result = await response.json();
    const candidate = result?.candidates?.[0];
    const jsonText = candidate?.content?.parts?.map((part) => part.text || "").join("").trim();

    if (candidate?.finishReason === "SAFETY") {
      return res.status(400).json({ error: "AI response blocked by safety filters." });
    }

    if (!jsonText) {
      return res.status(400).json({ error: "AI did not return valid JSON." });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        parsedData = JSON.parse(jsonText.slice(start, end + 1));
      } else {
        throw parseError;
      }
    }

    if (typeof parsedData.description !== "string" || !parsedData.description.trim() ||
        !["calories", "protein", "carbs", "fat"].every(key =>
          Number.isFinite(parsedData[key]) && parsedData[key] >= 0 && parsedData[key] <= 100000))
      return res.status(502).json({ error: "Could not read nutrition values. Please try again." });
    return res.status(200).json({
      description: parsedData.description.trim().slice(0, 200),
      ...Object.fromEntries(["calories", "protein", "carbs", "fat"].map(key => [key, parsedData[key]])),
    });
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Invalid request." });
    return res.status(500).json({ error: "Server error processing AI request." });
  }
}
