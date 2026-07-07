import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid notice ID" });
  }

  // Verify the notice exists
  try {
    const existingNotice = await prisma.notice.findUnique({
      where: { id },
    });
    if (!existingNotice) {
      return res.status(404).json({ error: "Notice not found" });
    }
  } catch (error) {
    console.error("Error looking up notice:", error);
    return res.status(500).json({ error: "Database error during notice lookup" });
  }

  if (req.method === "PUT") {
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

      const updatedNotice = await prisma.notice.update({
        where: { id },
        data: {
          title: title.trim(),
          body: body.trim(),
          category,
          priority,
          publishDate: new Date(publishDate),
          image: image && typeof image === "string" && image.trim() !== "" ? image.trim() : null,
        },
      });

      return res.status(200).json(updatedNotice);
    } catch (error: any) {
      console.error("Failed to update notice:", error);
      return res.status(500).json({ error: "Failed to update notice" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await prisma.notice.delete({
        where: { id },
      });
      return res.status(200).json({ message: "Notice deleted successfully" });
    } catch (error: any) {
      console.error("Failed to delete notice:", error);
      return res.status(500).json({ error: "Failed to delete notice" });
    }
  }

  res.setHeader("Allow", ["PUT", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
