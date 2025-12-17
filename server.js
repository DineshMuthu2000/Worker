app.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a receipt data extractor.

Return ONLY valid JSON.
Do NOT add any text before or after JSON.

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
    res.status(500).json({ error: "Extraction failed" });
  }
});
