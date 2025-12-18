import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   HARD CORS FIX (EXTENSIONS)
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
    return res.status(200).end();
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
   ROOT TEST
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
      return res.status(400).json({ error: "Invalid or empty receipt text" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are a receipt parser.
Return ONLY valid JSON.
No explanations.
No markdown.
No comments.

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
`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("Empty AI response");
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("❌ AI RAW OUTPUT:", raw);
      throw new Error("AI returned invalid JSON");
    }

    // Safety defaults
    parsed.items = Array.isArray(parsed.items) ? parsed.items : [];

    res.json(parsed);

  } catch (err) {
    console.error("❌ EXTRACTION ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
