import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ ROOT ROUTE (THIS FIXES "Not Found")
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ✅ TRANSLATE ROUTE
app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

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
    { "description": "", "code": "", "quantity": "", "price": "" }
  ]
}

Rules:
- Translate to English if needed
- Leave empty if not found
- Quantity and price must be numbers
- Output JSON ONLY
`
        },
        { role: "user", content: text }
      ],
      temperature: 0.1
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed" });
  }
});

// ✅ START SERVER
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
