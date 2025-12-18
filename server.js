import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS
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

app.use(express.json({ limit: "2mb" }));

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   GEMINI RECEIPT EXTRACTION
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY missing" });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
- Leave fields empty if not found
- Quantity must be a number (default 1 if missing)
- Price must be a number (no currency symbols)
- Split each product into a separate item
- Maximum 10 items only
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

    const geminiData = await geminiResponse.json();

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
    } catch (e) {
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
