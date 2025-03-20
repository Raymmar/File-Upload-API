import type { Express, Request } from "express";
import { createServer } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@shared/schema";
import { apiKeyAuth } from "./middleware/auth";

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

// Create custom error types
class FileUploadError extends Error {
  status: number;
  code: string;
  
  constructor(message: string, status = 400, code = 'UPLOAD_ERROR') {
    super(message);
    this.name = 'FileUploadError';
    this.status = status;
    this.code = code;
  }
}

// Create multer instance without calling single here
const uploadMiddleware = multer({
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log(`[Upload] Received file: ${file.originalname}, type: ${file.mimetype}`);
    
    // Check file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.mimetype)) {
      console.log(`[Upload] Rejected file type: ${file.mimetype}`);
      const error = new FileUploadError(
        `Invalid file type. Accepted types: ${ACCEPTED_IMAGE_TYPES.join(', ')}`,
        415, // Unsupported Media Type
        'INVALID_FILE_TYPE'
      );
      cb(error);
      return;
    }
    
    console.log(`[Upload] Accepted file: ${file.originalname}`);
    cb(null, true);
  }
});

// Create single file upload handler
const upload = uploadMiddleware.single("file");

export async function registerRoutes(app: Express) {
  // Public endpoints - no authentication required
  // Get all images
  app.get("/api/images", async (_req, res) => {
    try {
      console.log('[API] Getting all images');
      const images = await storage.getImages();
      console.log(`[API] Retrieved ${images.length} images`);
      res.json({ success: true, data: images } as ApiResponse<typeof images>);
    } catch (error: any) {
      console.error("[API] Failed to get images:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to get images",
        code: 'GET_IMAGES_ERROR'
      });
    }
  });

  // Get single image by ID - public
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

  // Serve images through API endpoint - public
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

  // Protected endpoints - require API key
  // Upload new image
  app.post("/api/upload", apiKeyAuth, async (req: Request, res, next) => {
    try {
      console.log('[API] Processing upload request');
      
      // Handle multer upload with custom error handling
      upload(req, res, async (err) => {
        if (err) {
          console.error('[API] Multer error:', err);
          
          // Handle multer-specific errors
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
              return res.status(413).json({ 
                success: false, 
                error: `File too large. Maximum size is ${maxSizeMB}MB`,
                code: 'FILE_TOO_LARGE' 
              });
            }
            
            // Other multer errors
            return res.status(400).json({ 
              success: false, 
              error: `Upload error: ${err.message}`,
              code: err.code || 'UPLOAD_ERROR' 
            });
          } 
          
          // Our custom file upload error
          if (err instanceof FileUploadError) {
            return res.status(err.status).json({
              success: false,
              error: err.message,
              code: err.code
            });
          }
          
          // Generic error
          return res.status(500).json({
            success: false,
            error: err.message || 'Unknown upload error',
            code: 'UPLOAD_ERROR'
          });
        }

        // Check if file exists in request
        const typedReq = req as MulterRequest;
        if (!typedReq.file) {
          console.log('[API] No file in request');
          return res.status(400).json({ 
            success: false, 
            error: "No file uploaded", 
            code: 'NO_FILE' 
          });
        }

        try {
          const file = typedReq.file;
          console.log(`[API] File received: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

          // Validate file size again (though multer should have caught this)
          if (file.size > MAX_FILE_SIZE) {
            const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
            const fileSizeMB = Math.round(file.size / (1024 * 1024));
            return res.status(413).json({ 
              success: false, 
              error: `File too large. Maximum size is ${maxSizeMB}MB, your file is ${fileSizeMB}MB`,
              code: 'FILE_TOO_LARGE' 
            });
          }

          // Get the Replit object storage bucket
          const bucket = await storage.getBucket();
          console.log(`[API] Using bucket: ${bucket}`);

          // Generate a unique filename with timestamp
          const timestamp = Date.now();
          const filename = `images/${timestamp}-${file.originalname}`;
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
        } catch (error: any) {
          console.error("[API] Upload processing error:", error);
          
          let errorMessage = "Failed to process upload";
          let errorCode = 'PROCESSING_ERROR';
          let statusCode = 500;
          
          // Add specific error handling for storage errors if needed
          if (error.message?.includes('bucket')) {
            errorMessage = "Storage bucket error";
            errorCode = 'STORAGE_BUCKET_ERROR';
          } else if (error.message?.includes('permission')) {
            errorMessage = "Storage permission denied";
            errorCode = 'STORAGE_PERMISSION_ERROR';
          } else if (error.name === 'TimeoutError') {
            errorMessage = "Upload timed out";
            errorCode = 'UPLOAD_TIMEOUT';
          }
          
          res.status(statusCode).json({ 
            success: false, 
            error: errorMessage,
            code: errorCode
          });
        }
      });
    } catch (error: any) {
      next(error); // Pass to express error handler
    }
  });

  // Delete image by ID - protected
  app.delete("/api/images/:id", apiKeyAuth, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}