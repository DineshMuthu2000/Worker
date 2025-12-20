import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS (Chrome Extension Safe)
========================= */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "2mb" }));

/* =========================
   ROOT TEST
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   RECEIPT EXTRACTION
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "No text provided" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are extracting receipt data for an automated form-filling task.

⚠️ OUTPUT ONLY VALID JSON
⚠️ NO explanations, NO markdown, NO text outside JSON

STRICT JSON FORMAT (DO NOT CHANGE KEYS):

{
  "storeName": "",
  "storePhone": "",
  "storeAddress": "",
  "purchaseDate": "",
  "purchaseTime": "",
  "totalPaid": "",
  "items": [
    {
      "description": "",
      "code": "",
      "quantity": 1,
      "price": 0
    }
  ]
}

RULES:
- Translate everything to English
- Each product MUST be its own object in "items"
- NEVER merge multiple products
- Quantity must be a number (default 1)
- Price must be a number (remove currency symbols)
- Product code optional (empty string if missing)
- Max 10 items only
- Leave missing fields empty

RECEIPT TEXT:
${text}
`
                }
              ]
            }
          ]
        })
      }
    );

    const geminiData = await response.json();

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({
        error: "Gemini response missing content",
        raw: geminiData
      });
    }

    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return res.status(500).json({
        error: "Invalid JSON returned by Gemini",
        raw: cleaned
      });
    }

    res.json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
