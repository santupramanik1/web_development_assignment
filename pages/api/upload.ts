import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure Next.js body parser size limit to handle images up to 5MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.SUPABASE_S3_REGION || "ap-northeast-1",
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || "",
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { file, filename, filetype } = req.body;

    if (!file || !filename || !filetype) {
      return res.status(400).json({ error: "Missing required fields: file, filename, filetype" });
    }

    // Clean up base64 prefix if present
    const base64Data = file.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique key
    const fileExtension = filename.split(".").pop() || "jpg";
    const uniqueKey = `notice-images/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

    const bucketName = process.env.SUPABASE_S3_BUCKET || "Reno";

    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueKey,
      Body: buffer,
      ContentType: filetype,
    };

    // Upload to Supabase S3
    await s3Client.send(new PutObjectCommand(uploadParams));

    // Construct the public URL for the uploaded file
    // Supabase public URL: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[key]
    // Extract project ref from the endpoint URL
    let projectRef = "znqwfeekzeipgkuwwash"; // Fallback
    const endpoint = process.env.SUPABASE_S3_ENDPOINT || "";
    const match = endpoint.match(/https:\/\/([^.]+)\.(?:supabase|storage\.supabase)\.co/);
    if (match && match[1]) {
      projectRef = match[1];
    }

    const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${uniqueKey}`;

    return res.status(200).json({ url: publicUrl });
  } catch (error: any) {
    console.error("S3 upload error:", error);
    return res.status(500).json({ error: error.message || "Failed to upload image to storage" });
  }
}
