// pages/api/bot-config.js
import dbConnect from "@/lib/db";
import BotConfig from "@/models/BotConfig";

export default async function handler(req, res) {
  await dbConnect();

  // GET → return current bot token
  if (req.method === "GET") {
    let config = await BotConfig.findOne().lean();
    return res.status(200).json({ ok: true, config });
  }

  // POST → save new bot token
  if (req.method === "POST") {
    const { telegramBotToken } = req.body || {};

    if (!telegramBotToken) {
      return res
        .status(400)
        .json({ ok: false, error: "telegramBotToken is required" });
    }

    // Clear old token and save new one
    await BotConfig.deleteMany({});
    const config = await BotConfig.create({ telegramBotToken });

    return res.status(200).json({ ok: true, config });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
