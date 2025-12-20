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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "2mb" }));

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   TRANSLATE / EXTRACT
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const response = await fetch(
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
You are extracting receipt data for a form auto-filling task.

⚠️ RETURN ONLY VALID JSON.
⚠️ DO NOT add explanations, text, markdown, or notes.

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

RULES (VERY IMPORTANT):
- Translate everything to English
- If a field is missing, leave it as empty string
- Each product MUST be its OWN object in items[]
- NEVER merge multiple products into one item
- Quantity MUST be a number (default = 1)
- Price MUST be a number (remove currency symbols)
- Max 10 items only
- Product code is optional (empty if not found)

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
    } catch {
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
   START
========================= */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
