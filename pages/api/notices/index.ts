import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Urgent-first ordering in the database query (Prisma orderBy)
      // Since "Urgent" starts with 'U' and "Normal" starts with 'N', descending alphabetical sort puts Urgent first.
      const notices = await prisma.notice.findMany({
        orderBy: [
          { priority: "desc" },
          { publishDate: "desc" },
        ],
      });
      return res.status(200).json(notices);
    } catch (error: any) {
      console.error("Failed to fetch notices:", error);
      return res.status(500).json({ error: "Failed to fetch notices" });
    }
  }

  if (req.method === "POST") {
    try {
      const { title, body, category, priority, publishDate, image } = req.body;

      // Server-side validation
      if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ error: "Title is required and cannot be empty" });
      }
      if (!body || typeof body !== "string" || body.trim() === "") {
        return res.status(400).json({ error: "Body is required and cannot be empty" });
      }
      if (!category || !["Exam", "Event", "General"].includes(category)) {
        return res.status(400).json({ error: "Category must be one of: Exam, Event, General" });
      }
      if (!priority || !["Normal", "Urgent"].includes(priority)) {
        return res.status(400).json({ error: "Priority must be either Normal or Urgent" });
      }
      if (!publishDate || isNaN(Date.parse(publishDate))) {
        return res.status(400).json({ error: "A valid publish date is required" });
      }

      const newNotice = await prisma.notice.create({
        data: {
          title: title.trim(),
          body: body.trim(),
          category,
          priority,
          publishDate: new Date(publishDate),
          image: image && typeof image === "string" && image.trim() !== "" ? image.trim() : null,
        },
      });

      return res.status(201).json(newNotice);
    } catch (error: any) {
      console.error("Failed to create notice:", error);
      return res.status(500).json({ error: "Failed to create notice" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
