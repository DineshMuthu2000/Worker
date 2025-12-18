import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS (Chrome Extensions)
========================= */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "2mb" }));

/* =========================
   OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   TEST ROUTE
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

    if (!text || text.length < 10) {
      return res.status(400).json({
        error: "Empty or invalid receipt text"
      });
    }

    const prompt = `
You are a receipt parser.

Extract structured JSON ONLY.
No explanations. No markdown.

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
- If a value is missing, use empty string ""
- Quantity must be numeric if possible
- Price must be numeric (use minus for discounts)
- English letters only in descriptions

Receipt text:
${text}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let raw = completion.choices[0].message.content;

    // 🔧 SAFETY CLEAN
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON PARSE ERROR:", raw);
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw
      });
    }

    // Ensure structure
    parsed.items = Array.isArray(parsed.items) ? parsed.items : [];

    res.json(parsed);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      error: err.message || "Server extraction error"
    });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
