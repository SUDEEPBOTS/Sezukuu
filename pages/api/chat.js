// pages/api/chat.js
import dbConnect from "@/lib/db";
import { generateWithYuki } from "@/lib/gemini";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed" });
  }

  const { message } = req.body || {};

  if (!message || message.trim() === "") {
    return res.status(400).json({ ok: false, error: "Message is required" });
  }

  try {
    // Basic panel prompt
    const prompt = `
You are Yuki, an AI assistant used inside a control panel for testing.
Keep your reply short (1-2 lines), friendly, and clear.

User: ${message}
Yuki:`;

    const reply = await generateWithYuki(prompt);

    return res.status(200).json({ ok: true, reply });
  } catch (e) {
    console.error("chat.js error:", e);
    return res.status(500).json({
      ok: false,
      error: "Failed to get response from Yuki",
    });
  }
}
