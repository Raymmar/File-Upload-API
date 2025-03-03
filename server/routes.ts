import type { Express, Request } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@shared/schema";

// Define types for multer request
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Standard API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
      res.json({ success: true, data: images } as ApiResponse<typeof images>);
    } catch (error) {
      console.error("[API] Failed to get images:", error);
      res.status(500).json({ success: false, error: "Failed to get images" });
    }
  });

  // Get single image by ID
  app.get("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: "Invalid image ID" });
      }

      const image = await storage.getImage(id);
      if (!image) {
        return res.status(404).json({ success: false, error: "Image not found" });
      }

      res.json({ success: true, data: image });
    } catch (error) {
      console.error("[API] Failed to get image:", error);
      res.status(500).json({ success: false, error: "Failed to get image" });
    }
  });

  // Delete image by ID
  app.delete("/api/images/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: "Invalid image ID" });
      }

      const deleted = await storage.deleteImage(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Image not found or could not be deleted" });
      }

      res.json({ success: true, data: { id } });
    } catch (error) {
      console.error("[API] Failed to delete image:", error);
      res.status(500).json({ success: false, error: "Failed to delete image" });
    }
  });

  // Serve images through API endpoint
  app.get("/api/storage/:filename(*)", async (req, res, next) => {
    try {
      console.log(`[API] Serving file: ${req.params.filename}`);
      const filename = decodeURIComponent(req.params.filename);

      // Get the file data from Object Storage
      const { ok, value: buffer, error } = await storage.client.downloadAsBytes(filename);

      if (!ok || !buffer) {
        console.error('[API] File not found:', error);
        return res.status(404).json({ success: false, error: "File not found" });
      }

      // Set appropriate content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentType =
        ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
          ? 'image/gif'
          : 'application/octet-stream';

      // Set headers for caching and content type
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.send(buffer[0]); // Send the first element of the buffer array
    } catch (error) {
      console.error("[API] Error serving file:", error);
      next(error);
    }
  });

  // Upload new image
  app.post("/api/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      console.log('[API] Processing upload request');

      if (!req.file) {
        console.log('[API] No file in request');
        return res.status(400).json({ success: false, error: "No file uploaded" });
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
      const url = `/api/storage/${encodeURIComponent(filename)}`;
      console.log(`[API] Generated public URL: ${url}`);

      // Save metadata to storage
      const image = await storage.createImage({
        filename,
        url,
        contentType: file.mimetype,
        size: file.size
      });
      console.log('[API] Image metadata saved:', image);

      res.json({ success: true, data: image });
    } catch (error) {
      console.error("[API] Upload error:", error);
      res.status(500).json({ success: false, error: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}