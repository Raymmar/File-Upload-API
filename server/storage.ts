import { images, type Image, type InsertImage } from "@shared/schema";
import { Client } from '@replit/object-storage';

function sanitizeFilename(filename: string): string {
  // Remove special characters and spaces, replace with hyphens
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-'); // Replace multiple consecutive hyphens with a single one

  const [name, ext] = sanitized.split('.');
  // Ensure we don't exceed reasonable filename length
  const truncatedName = name.slice(0, 50);
  return `${truncatedName}.${ext}`;
}

export interface IStorage {
  getBucket(): Promise<string>;
  uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void>;
  getFileUrl(bucket: string, filename: string): Promise<string>;
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getImages(): Promise<Image[]>;
}

export class MemStorage implements IStorage {
  client: Client;
  private images: Map<number, Image>;
  private currentId: number;

  constructor() {
    this.images = new Map();
    this.currentId = 1;
    this.client = new Client();
    console.log('Storage initialized with Object Storage client');
  }

  async getBucket(): Promise<string> {
    return 'default-bucket';
  }

  async uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      const sanitizedFilename = sanitizeFilename(filename);
      console.log(`[Storage] Starting upload for file: ${filename}`);
      console.log(`[Storage] Sanitized filename: ${sanitizedFilename}`);
      console.log(`[Storage] File size: ${buffer.length} bytes`);
      console.log(`[Storage] Content type: ${contentType}`);

      const { ok, error } = await this.client.uploadFromBytes(sanitizedFilename, buffer);

      if (!ok) {
        console.error('[Storage] Upload failed:', error);
        throw new Error(`Failed to upload file: ${error}`);
      }

      console.log(`[Storage] Upload successful for file: ${sanitizedFilename}`);
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
  }

  async getFileUrl(bucket: string, filename: string): Promise<string> {
    try {
      console.log(`[Storage] Getting URL for file: ${filename}`);
      const sanitizedFilename = sanitizeFilename(filename);

      // Return URL to our API endpoint
      const url = `/api/storage/${encodeURIComponent(sanitizedFilename)}`;
      console.log(`[Storage] Generated URL: ${url}`);
      return url;
    } catch (error) {
      console.error('[Storage] Error getting URL:', error);
      throw error;
    }
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    try {
      console.log('[Storage] Creating image record:', insertImage);
      const id = this.currentId++;
      const image: Image = { 
        id, 
        filename: sanitizeFilename(insertImage.filename),
        url: insertImage.url,
        contentType: insertImage.contentType,
        size: insertImage.size
      };
      this.images.set(id, image);
      console.log('[Storage] Image record created:', image);
      return image;
    } catch (error) {
      console.error('[Storage] Error creating image record:', error);
      throw error;
    }
  }

  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async getImages(): Promise<Image[]> {
    try {
      console.log('[Storage] Fetching all images');
      const { ok, value: objects, error } = await this.client.list();

      if (!ok) {
        console.error('[Storage] Error listing objects:', error);
        return [];
      }

      console.log('[Storage] Objects in storage:', objects);

      // Convert the storage objects to Image records
      const images = await Promise.all(
        objects.map(async (obj, index) => {
          const filename = obj.name;
          const storageDomain = process.env.REPLIT_OBJECT_STORAGE_URL || 'storage.replit.com';
          const bucketId = 'replit-objstore-86a9d9a7-f963-4f43-9cd8-a2c5f2d7b1e8';
          const url = `https://${storageDomain}/${bucketId}/${filename}`;

          // Determine content type from filename
          const contentType = filename.toLowerCase().endsWith('.png') 
            ? 'image/png' 
            : 'image/jpeg';

          // Create an Image record if it doesn't exist
          if (!this.images.has(index + 1)) {
            const image: Image = {
              id: index + 1,
              filename,
              url,
              contentType,
              size: 0 // We don't have the actual size from the list operation
            };
            this.images.set(index + 1, image);
          }

          return this.images.get(index + 1)!;
        })
      );

      console.log(`[Storage] Returning ${images.length} images`);
      return images;
    } catch (error) {
      console.error('[Storage] Error fetching images:', error);
      return [];
    }
  }
}

export const storage = new MemStorage();