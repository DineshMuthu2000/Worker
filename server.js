import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   HARD CORS FIX (FOR CHROME EXTENSIONS)
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

app.use(express.json());

/* =========================
   OPENAI CLIENT
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   ROOT ROUTE (TEST)
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

    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: "No valid text provided" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are a receipt data extractor.

Input is raw OCR text from a shopping receipt.
Text may be noisy, multilingual, and unstructured.

Your task:
- Extract structured receipt data
- Return ONLY valid JSON
- No explanations
- No markdown
- No extra text

Rules:
- Detect store name, phone, address if present
- Detect purchase date and time
- Detect final total paid only
- Ignore subtotals
- Ignore tax summary lines
- Ignore payment method lines
- Discounts (negative prices) are NOT items

Items rules:
- Items must be real purchased products
- description: product name only
- code: barcode or product code if present
- quantity: number (default 1)
- price: final price paid for that item

If data is missing, return empty string.

JSON format (MUST MATCH EXACTLY):

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
`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const raw = completion.choices[0].message.content;

    const data = JSON.parse(raw);

    res.json(data);

  } catch (err) {
    console.error("Extraction error:", err);
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
