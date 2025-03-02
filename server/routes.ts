import type { Express, Request } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@shared/schema";

// Define types for multer request
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(new Error("Invalid file type"));
      return;
    }
    cb(null, true);
  }
});

export async function registerRoutes(app: Express) {
  // Get all images
  app.get("/api/images", async (_req, res) => {
    try {
      const images = await storage.getImages();
      res.json(images);
    } catch (error) {
      console.error("Failed to get images:", error);
      res.status(500).json({ message: "Failed to get images" });
    }
  });

  app.post("/api/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;

      // Get the Replit object storage bucket
      const bucket = await storage.getBucket();

      // Generate a unique filename
      const filename = `${Date.now()}-${file.originalname}`;

      // Upload to Replit storage
      await storage.uploadFile(bucket, filename, file.buffer, file.mimetype);

      // Get the public URL
      const url = await storage.getFileUrl(bucket, filename);

      // Save metadata to storage
      const image = await storage.createImage({
        filename,
        url,
        contentType: file.mimetype,
        size: file.size
      });

      res.json(image);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Add endpoint to serve files
  app.get("/api/files/:filename", async (req, res) => {
    try {
      const fileData = await storage.getFile(req.params.filename);
      if (!fileData) {
        return res.status(404).json({ message: "File not found" });
      }

      const buffer = Buffer.from(fileData.buffer, 'base64');
      res.setHeader('Content-Type', fileData.contentType);
      res.send(buffer);
    } catch (error) {
      console.error("File serving error:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}