// lib/gemini.js
import ApiKey from "@/models/ApiKey";
import dbConnect from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini call with specific key
async function callGeminiWithKey(apiKey, prompt) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) throw new Error("Gemini returned no text");
    return text;
  } catch (err) {
    console.error("Gemini error for key:", apiKey, err.message);
    throw err;
  }
}

export async function generateWithYuki(prompt) {
  await dbConnect();

  // Active keys only
  const keys = await ApiKey.find({ active: true }).sort({ createdAt: -1 }).lean();

  if (!keys.length) {
    throw new Error("No active API keys available");
  }

  let lastError = null;

  // Try each active key
  for (const key of keys) {
    try {
      const reply = await callGeminiWithKey(key.key, prompt);
      return reply; // success
    } catch (err) {
      lastError = err;

      // Disable the key if it's rate limited or blocked
      if (
        err?.message?.includes("429") ||
        err?.message?.includes("quota") ||
        err?.message?.includes("permission") ||
        err?.message?.includes("API key not valid") ||
        err?.message?.includes("403")
      ) {
        await ApiKey.findByIdAndUpdate(key._id, {
          active: false,
          failedAt: new Date(),
        });

        console.log(`⚠️ API key disabled due to error:`, key.label);
      }

      // Move to next key automatically
      continue;
    }
  }

  // All keys failed
  throw new Error(
    "All Gemini API keys failed. Last error: " + (lastError?.message || "Unknown")
  );
}
