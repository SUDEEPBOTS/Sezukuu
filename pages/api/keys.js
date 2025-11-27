// pages/api/keys.js
import dbConnect from "@/lib/db";
import ApiKey from "@/models/ApiKey";

export default async function handler(req, res) {
  await dbConnect();

  // GET → list all keys
  if (req.method === "GET") {
    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ ok: true, keys });
  }

  // POST → add new key
  if (req.method === "POST") {
    const { label, key } = req.body || {};

    if (!key) {
      return res.status(400).json({ ok: false, error: "API key required" });
    }

    await ApiKey.create({
      label: label || "Untitled",
      key,
      active: true,
      failedAt: null,
    });

    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ ok: true, keys });
  }

  // PATCH → toggle active / disable key
  if (req.method === "PATCH") {
    const { id, active } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: "Key id required" });
    }

    await ApiKey.findByIdAndUpdate(id, { active, failedAt: null });

    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ ok: true, keys });
  }

  // DELETE → remove key
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ ok: false, error: "Key id required" });
    }

    await ApiKey.findByIdAndDelete(id);

    const keys = await ApiKey.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ ok: true, keys });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
