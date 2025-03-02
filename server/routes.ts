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
    console.log(`[Upload] Received file: ${file.originalname}, type: ${file.mimetype}`);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.mimetype)) {
      console.log(`[Upload] Rejected file type: ${file.mimetype}`);
      cb(new Error("Invalid file type"));
      return;
    }
    console.log(`[Upload] Accepted file: ${file.originalname}`);
    cb(null, true);
  }
});

export async function registerRoutes(app: Express) {
  // Get all images
  app.get("/api/images", async (_req, res) => {
    try {
      console.log('[API] Getting all images');
      const images = await storage.getImages();
      console.log(`[API] Retrieved ${images.length} images`);
      res.json(images);
    } catch (error) {
      console.error("[API] Failed to get images:", error);
      res.status(500).json({ message: "Failed to get images" });
    }
  });

  app.post("/api/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      console.log('[API] Processing upload request');

      if (!req.file) {
        console.log('[API] No file in request');
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      console.log(`[API] File received: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

      // Get the Replit object storage bucket
      const bucket = await storage.getBucket();
      console.log(`[API] Using bucket: ${bucket}`);

      // Generate a unique filename with timestamp
      const filename = `${Date.now()}-${file.originalname}`;
      console.log(`[API] Generated filename: ${filename}`);

      // Upload to Replit storage
      await storage.uploadFile(bucket, filename, file.buffer, file.mimetype);
      console.log('[API] File uploaded to storage');

      // Get the public URL
      const url = await storage.getFileUrl(bucket, filename);
      console.log(`[API] Generated public URL: ${url}`);

      // Save metadata to storage
      const image = await storage.createImage({
        filename,
        url,
        contentType: file.mimetype,
        size: file.size
      });
      console.log('[API] Image metadata saved:', image);

      res.json(image);
    } catch (error) {
      console.error("[API] Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Serve files through our Express server
  app.get("/files/:filename", async (req, res) => {
    try {
      console.log(`[API] Serving file: ${req.params.filename}`);
      const { ok, value: buffer, error } = await storage.client.downloadAsBytes(req.params.filename);

      if (!ok || !buffer) {
        console.error('[API] File not found:', error);
        return res.status(404).json({ message: "File not found" });
      }

      // Set appropriate content type
      const contentType = req.params.filename.toLowerCase().endsWith('.png') 
        ? 'image/png' 
        : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (error) {
      console.error("[API] Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}