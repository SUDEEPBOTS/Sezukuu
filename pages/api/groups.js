// pages/api/groups.js
import dbConnect from "@/lib/db";
import Group from "@/models/Group";

export default async function handler(req, res) {
  await dbConnect();

  // Only GET allowed
  if (req.method === "GET") {
    const groups = await Group.find({})
      .sort({ lastActiveAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      ok: true,
      groups,
    });
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed",
  });
}
