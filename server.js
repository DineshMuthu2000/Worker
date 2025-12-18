import express from "express";
import dotenv from "dotenv";

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
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   GEMINI TRANSLATE ROUTE
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided" });
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
Extract receipt data and return ONLY valid JSON.

JSON format:
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

Rules:
- Translate to English
- Leave empty if not found
- Quantity and price must be numbers

Receipt:
${text}
`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // ✅ SAFE FALLBACK (prevents frontend crash)
      parsed = {
        storeName: "",
        storePhone: "",
        storeAddress: "",
        purchaseDate: "",
        purchaseTime: "",
        totalPaid: "",
        items: []
      };
    }

    return res.json(parsed);

  } catch (err) {
    console.error("TRANSLATE ERROR:", err);

    // ✅ ALWAYS RETURN JSON
    return res.status(500).json({
      error: err.message || "Extraction failed"
    });
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
