import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   CORS (Chrome Extension FIX)
========================= */
app.use(cors({
  origin: function (origin, callback) {
    // Allow Chrome extensions & normal requests
    if (!origin || origin.startsWith("chrome-extension://")) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =========================
   OpenAI Client
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   ROOT ROUTE (IMPORTANT)
========================= */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* =========================
   TRANSLATE / EXTRACT ROUTE
========================= */
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
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
- Translate to English if needed
- Leave fields empty if not found
- Quantity and price must be numbers
- Output JSON ONLY
`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1
    });

    const raw = completion.choices[0].message.content.trim();
    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      storeName: "",
      storePhone: "",
      storeAddress: "",
      purchaseDate: "",
      purchaseTime: "",
      totalPaid: "",
      items: []
    });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
