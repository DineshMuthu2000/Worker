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
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "3mb" }));

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   GEMINI EXTRACT ROUTE
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "No receipt text provided" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not set" });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are extracting receipt data for a form-filling task.

Return ONLY valid JSON.
Do NOT include explanations, markdown, or extra text.

STRICT JSON FORMAT:
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
      "quantity": "",
      "price": ""
    }
  ]
}

RULES:
- Translate everything to English
- If a field is missing, leave it as an empty string
- Quantity must be a number (default to 1 if missing)
- Price must be a number (no currency symbols)
- Split EACH product into a separate item row
- Maximum 10 items only (ignore extra items)
- Product codes are optional (leave empty if not found)
- Do NOT merge multiple products into one line

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

    const rawResponse = await geminiResponse.text();

    if (!rawResponse) {
      return res.status(500).json({ error: "Empty response from Gemini" });
    }

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      return res.status(500).json({
        error: "Gemini returned non-JSON response",
        raw: rawResponse
      });
    }

    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({
        error: "Gemini response missing content",
        raw: data
      });
    }

    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({
        error: "Failed to parse extracted JSON",
        raw: cleaned
      });
    }

    // Ensure items is always an array
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    res.json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
