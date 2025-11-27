// pages/api/telegram-webhook.js

import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
import Group from "@/models/Group";
import BotConfig from "@/models/BotConfig";
import BotSettings from "@/models/BotSettings";
import { generateWithYuki } from "@/lib/gemini";

// Telegram raw body support
export const config = {
  api: { bodyParser: false },
};

// Read raw body
function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Telegram send message
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
    update = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const chatType = msg.chat.type;
  const userText = msg.text || msg.caption || "";
  const isGroup =
    chatType === "group" ||
    chatType === "supergroup" ||
    chatType.includes("group");

  // Load bot token
  const botCfg = await BotConfig.findOne().lean();
  if (!botCfg?.telegramBotToken) return res.status(200).json({ ok: true });
  const BOT_TOKEN = botCfg.telegramBotToken;

  // Panel settings
  const settings = (await BotSettings.findOne().lean()) || {};

  const ownerName = settings.ownerName || "Owner";
  const botName = settings.botName || "Yuki";
  const botUsername =
    (settings.botUsername || "yuki_ai_bot").replace("@", "");
  const gender = settings.gender || "female";
  const personality = settings.personality || "normal";
  const groupLink = settings.groupLink || "";

  const lower = userText.toLowerCase().trim();

  // -----------------------
  // GROUP LOGGER
  // -----------------------
  if (isGroup) {
    await Group.findOneAndUpdate(
      { chatId: String(chatId) },
      {
        chatId: String(chatId),
        title: msg.chat.title || "",
        username: msg.chat.username || "",
        type: chatType,
        lastActiveAt: new Date(),
        $setOnInsert: { firstSeenAt: new Date() },
      },
      { upsert: true }
    );
  }

  // -----------------------
  // /start COMMAND
  // -----------------------
  if (lower.startsWith("/start")) {
    let intro = `Hey, main *${botName}* hu ✨`;

    if (groupLink) intro += `\nGroup: ${groupLink}`;
    intro += `\nOwner: *${ownerName}*`;
    intro += `\nBot: *@${botUsername}*`;

    await sendMessage(BOT_TOKEN, chatId, intro);
    return res.status(200).json({ ok: true });
  }

  // -----------------------
  // SMART GROUP REPLY
  // -----------------------
  let shouldReply = false;

  // 1) PRIVATE → always reply
  if (!isGroup) shouldReply = true;

  // 2) User replied to bot
  if (
    msg.reply_to_message?.from?.username?.toLowerCase() ===
    botUsername.toLowerCase()
  ) {
    shouldReply = true;
  }

  // 3) Conversation flow: last message by bot
  const existingMemory = await Memory.findOne({ chatId, userId });
  if (existingMemory && existingMemory.history.length > 0) {
    const last = existingMemory.history[existingMemory.history.length - 1];
    if (last.role === "assistant") shouldReply = true;
  }

  // 4) Mention or name usage
  if (
    lower.includes(botName.toLowerCase()) ||
    lower.includes("@" + botUsername.toLowerCase())
  ) {
    shouldReply = true;
  }

  // 5) Anti spam
  if (isGroup && !shouldReply) {
    return res.status(200).json({ ok: true });
  }

  // -----------------------
  // MEMORY HANDLING
  // -----------------------
  let memory = await Memory.findOne({ chatId, userId });
  if (!memory) {
    memory = await Memory.create({
      chatId,
      userId,
      mode: personality,
      history: [],
    });
  }

  // Save user message
  memory.history.push({
    role: "user",
    text: userText,
    time: new Date(),
  });

  if (memory.history.length > 10) {
    memory.history = memory.history.slice(-10);
  }

  memory.mode = personality;
  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
    .join("\n");

  // -----------------------
  // PROMPT SYSTEM
  // -----------------------

  const genderLine =
    gender === "male"
      ? "Tum 18 saal ke Delhi ke ladke ho, chill + friendly persona ke sath."
      : "Tum 18 saal ki Delhi ki cute girl ho, soft + friendly persona ke sath.";

  let toneLine = {
    flirty:
      "Tum flirty tone me playful, teasing answers doge. Emojis allowed. Over bold nahi hona.",
    professional:
      "Tum calm, polite, professional tone me reply doge. No flirting.",
    normal:
      "Tum soft Hinglish me, friendly natural tone me 1–3 lines me reply doge.",
  }[personality];

  const ownerRule = `
Tumhara REAL owner sirf *${ownerName}* hai.
Owner ka naam sirf tab lo jab koi specifically pooche.
`;

  const finalPrompt = `
Tumhara naam *${botName}* hai.
${genderLine}
${toneLine}
${ownerRule}

Conversation:
${historyText}

User: ${userText}
Her:
`;

  // -----------------------
  // TYPING EFFECT
  // -----------------------
  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }
  );

  await new Promise((r) => setTimeout(r, 900));

  // -----------------------
  // AI REPLY
  // -----------------------
  let reply;
  try {
    reply = await generateWithYuki(finalPrompt);
  } catch (err) {
    reply = "Oops, thoda issue aa gaya 😅";
  }

  // Save assistant msg
  memory.history.push({
    role: "assistant",
    text: reply,
    time: new Date(),
  });
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);
  await memory.save();

  // Send Telegram message
  await sendMessage(BOT_TOKEN, chatId, reply);

  return res.status(200).json({ ok: true });
}
