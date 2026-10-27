import { requireApiUser } from "../server/api-security.js";
import dotenv from "dotenv";
import { validateGoalDraft } from "../src/utils/goalRecommendations.js";
dotenv.config({ path: ".env.local", quiet: true });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  let summary;
  try {
    if (typeof req.body === "string" && req.body.length > 4000)
      throw new Error();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const targets = validateGoalDraft(body);
    if (
      !["cut", "maintain", "bulk"].includes(body.goal) ||
      ![
        "Your maintenance estimate",
        "Mifflin–St Jeor × activity factor",
      ].includes(body.method) ||
      !Number.isFinite(body.maintenance) ||
      body.maintenance < 1200 ||
      body.maintenance > 8000 ||
      ![-15, -10, 0, 5, 10].includes(body.adjustmentPercent)
    )
      throw new Error();
    summary = {
      ...targets,
      maintenance: body.maintenance,
      method: body.method,
      goal: body.goal,
      adjustmentPercent: body.adjustmentPercent,
    };
  } catch {
    return res.status(400).json({ error: "Invalid goal calculation." });
  }
  if (!await requireApiUser(req, res)) return;
  if (!process.env.GEMINI_API_KEY)
    return res.status(503).json({
      error:
        "AI explanation unavailable. Your calculated targets are still ready to review.",
    });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash").replace(
      /^models\//,
      "",
    );
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Explain the supplied adult nutrition calculation in 2–3 short plain-language sentences. The numbers were computed separately: do not invent, recalculate, or recommend different targets. Explain the calorie adjustment and protein/fat/carbohydrate allocation. Describe maintenance as an estimate, never a measured fact. Say this is a starting point to reassess with several weeks of weight trends, energy and training. Do not promise weight loss or muscle gain, give medical advice, or infer health status. No Markdown or headings. Return JSON with explanation only.",
              },
            ],
          },
          contents: [
            { role: "user", parts: [{ text: JSON.stringify(summary) }] },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { explanation: { type: "STRING" } },
              required: ["explanation"],
            },
          },
        }),
      },
    );
    if (!response.ok) throw new Error();
    const result = await response.json();
    const raw = result?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("");
    const explanation = JSON.parse(raw || "{}").explanation;
    if (typeof explanation !== "string" || !explanation.trim())
      throw new Error();
    return res
      .status(200)
      .json({ explanation: explanation.trim().slice(0, 900) });
  } catch {
    return res.status(502).json({
      error:
        "AI explanation unavailable. Your calculated targets are still ready to review.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
