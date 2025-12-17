import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== SIMPLE CORS FIX (WORKS FOR EXTENSIONS) ===== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* MAIN API */
app.post("/translate", async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) return res.json({});

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `
Return ONLY JSON:
{
  "storeName": "",
  "totalPaid": "",
  "items": []
}
`
        },
        { role: "user", content: text }
      ]
    });

    const data = JSON.parse(
      completion.choices[0].message.content
    );

    res.json(data);
  } catch (e) {
    res.json({});
  }
});

/* START */
app.listen(PORT, () => {
  console.log("Server running");
});


