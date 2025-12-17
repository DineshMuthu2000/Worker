import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================
   HARD CORS FIX (EXTENSIONS)
============================ */
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

  // IMPORTANT: handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

/* ============================
   OPENAI CONFIG
============================ */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================
   ROOT TEST ROUTE
============================ */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* ============================
   TRANSLATE ROUTE
============================ */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
You are a receipt data extractor.

Return ONLY valid JSON.
No explanations.

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
- Translate to English if needed
- Leave empty if not found
- Quantity and price must be numbers
`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const raw = completion.choices[0].message.content.trim();
    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Extraction failed" });
  }
});

/* ============================
   START SERVER
============================ */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
