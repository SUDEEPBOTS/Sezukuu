// pages/api/telegram-webhook.js

import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
import Group from "@/models/Group";
import BotConfig from "@/models/BotConfig";
import BotSettings from "@/models/BotSettings";
import { generateWithYuki } from "@/lib/gemini";

// Telegram raw body handler
export const config = {
  api: { bodyParser: false },
};

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function sendMessage(token, chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...extra,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  await dbConnect();
  const raw = await parseRawBody(req);
  let update;

  try {
    update = JSON.parse(raw);
  } catch {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const userId = msg.from.id.toString();
  const userText = msg.text || msg.caption || "";
  const lower = userText.toLowerCase();
  const isGroup = chatType.includes("group");

  // Load bot config
  const cfg = await BotConfig.findOne().lean();
  if (!cfg?.telegramBotToken) return res.status(200).json({ ok: true });
  const BOT_TOKEN = cfg.telegramBotToken;

  // Settings
  const settings = (await BotSettings.findOne().lean()) || {};
  const botName = settings.botName || "Yuki";
  const ownerName = settings.ownerName || "Owner";
  const botUsername = (settings.botUsername || "yuki_ai_bot")
    .replace("@", "")
    .toLowerCase();
  const gender = settings.gender || "female";
  const personality = settings.personality || "normal";
  const groupLink = settings.groupLink || "";

  // Name cleaning
  const cleanText = lower.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const cleanBotName = botName.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();

  // -------------------------
  // /start command (DM + group)
  // -------------------------
  if (lower.startsWith("/start")) {
    let intro = `Hey, main *${botName}* hu ✨`;
    if (groupLink) intro += `\nGroup: ${groupLink}`;
    intro += `\nOwner: *${ownerName}*`;
    intro += `\nBot: *@${botUsername}*`;

    await sendMessage(BOT_TOKEN, chatId, intro, {
      reply_to_message_id: msg.message_id,
    });

    return res.status(200).json({ ok: true });
  }

  // =================================================
  // 🔥 PRIVATE CHAT FIX — ALWAYS REPLY
  // =================================================
  if (chatType === "private") {

    // Memory
    let memory = await Memory.findOne({ chatId, userId });
    if (!memory) {
      memory = await Memory.create({
        chatId,
        userId,
        mode: personality,
        history: [],
      });
    }

    memory.history.push({ role: "user", text: userText });
    if (memory.history.length > 10)
      memory.history = memory.history.slice(-10);
    await memory.save();

    const historyText = memory.history
      .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
      .join("\n");

    const prompt = `
Tumhara naam *${botName}* hai.
Tum ek friendly, sweet, natural tone me baat karne wali ho.

Owner = ${ownerName}

Conversation:
${historyText}

User: ${userText}
Her:
`;

    let reply;
    try {
      reply = await generateWithYuki(prompt);
    } catch {
      reply = "Oops, thoda issue aa gaya 😅";
    }

    memory.history.push({ role: "assistant", text: reply });
    if (memory.history.length > 10)
      memory.history = memory.history.slice(-10);
    await memory.save();

    await sendMessage(BOT_TOKEN, chatId, reply, {
      reply_to_message_id: msg.message_id,
    });

    return res.status(200).json({ ok: true });
  }

  // =================================================
  // 🔥 GROUP STRICT MODE
  // =================================================
  let shouldReply = false;

  // 1) Reply-to-bot
  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    shouldReply = true;

  // 2) @mention
  if (lower.includes("@" + botUsername))
    shouldReply = true;

  // 3) Bot name mention
  if (cleanText.includes(cleanBotName)) shouldReply = true;

  // 4) Ignore everything else
  if (!shouldReply) return res.status(200).json({ ok: true });

  // -------------------------
  // Memory for group
  // -------------------------
  let memory = await Memory.findOne({ chatId, userId });
  if (!memory) {
    memory = await Memory.create({
      chatId,
      userId,
      mode: personality,
      history: [],
    });
  }

  memory.history.push({ role: "user", text: userText });
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);
  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
    .join("\n");

  const prompt = `
Tumhara naam *${botName}* hai.
Tum group me sirf jab bulaaye jao tab reply karti ho.

Conversation:
${historyText}

User: ${userText}
Her:
`;

  let reply;
  try {
    reply = await generateWithYuki(prompt);
  } catch {
    reply = "Oops, thoda issue aa gaya 😅";
  }

  memory.history.push({ role: "assistant", text: reply });
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);
  await memory.save();

  await sendMessage(BOT_TOKEN, chatId, reply, {
    reply_to_message_id: msg.message_id,
  });

  return res.status(200).json({ ok: true });
}
