import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

// ✅ REQUIRED MIDDLEWARE
app.use(cors());
app.use(express.json());

// ✅ OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ✅ TRANSLATE + EXTRACT ROUTE
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
- NO extra text, ONLY JSON
`
        },
        { role: "user", content: text }
      ],
      temperature: 0.1
    });

    const raw = completion.choices[0].message.content.trim();
    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Extraction failed" });
  }
});

// ✅ START SERVER
app.listen(port, () => {
  console.log("Server running on port", port);
});
