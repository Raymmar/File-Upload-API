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
  deleteImage(id: number): Promise<boolean>;
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
      // Always store files in the 'images' directory
      const filepath = `images/${sanitizedFilename}`;
      console.log(`[Storage] Starting upload for file: ${filename}`);
      console.log(`[Storage] Sanitized filepath: ${filepath}`);
      console.log(`[Storage] File size: ${buffer.length} bytes`);
      console.log(`[Storage] Content type: ${contentType}`);

      const { ok, error } = await this.client.uploadFromBytes(filepath, buffer);

      if (!ok) {
        console.error('[Storage] Upload failed:', error);
        throw new Error(`Failed to upload file: ${error}`);
      }

      console.log(`[Storage] Upload successful for file: ${filepath}`);
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
  }

  async getFileUrl(bucket: string, filename: string): Promise<string> {
    try {
      console.log(`[Storage] Getting URL for file: ${filename}`);
      const sanitizedFilename = sanitizeFilename(filename);
      const filepath = `images/${sanitizedFilename}`;

      // Return URL to our API endpoint
      const url = `/api/storage/${encodeURIComponent(filepath)}`;
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
      // Ensure the filename has the 'images/' prefix
      const filename = insertImage.filename.startsWith('images/') 
        ? insertImage.filename 
        : `images/${sanitizeFilename(insertImage.filename)}`;

      const image: Image = { 
        id, 
        filename,
        url: insertImage.url,
        contentType: insertImage.contentType,
        size: insertImage.size || 0
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

      // Filter objects to include only those in the images directory
      const imageObjects = objects.filter(obj => obj.name.startsWith('images/'));

      // Convert the storage objects to Image records
      const images = await Promise.all(
        imageObjects.map(async (obj, index) => {
          const filename = obj.name;

          // Construct URL using our API endpoint
          const url = `/api/storage/${encodeURIComponent(filename)}`;

          // Determine content type from filename
          const contentType = filename.toLowerCase().endsWith('.png') 
            ? 'image/png' 
            : 'image/jpeg';

          // Create an Image record if it doesn't exist
          const newImage: Image = {
            id: index + 1,
            filename,
            url,
            contentType,
            size: 0 // We don't have the actual size from the list operation
          };

          // Update our local map
          this.images.set(index + 1, newImage);
          return newImage;
        })
      );

      // Update currentId to be greater than the highest id
      this.currentId = Math.max(...images.map(img => img.id), 0) + 1;

      console.log(`[Storage] Returning ${images.length} images`);
      return images;
    } catch (error) {
      console.error('[Storage] Error fetching images:', error);
      return [];
    }
  }

  async deleteImage(id: number): Promise<boolean> {
    try {
      console.log(`[Storage] Attempting to delete image with id: ${id}`);
      const image = await this.getImage(id);

      if (!image) {
        console.log(`[Storage] Image with id ${id} not found`);
        return false;
      }

      // Delete from object storage
      const { ok, error } = await this.client.delete(image.filename);

      if (!ok) {
        console.error('[Storage] Error deleting from storage:', error);
        return false;
      }

      // Remove from our local map
      this.images.delete(id);
      console.log(`[Storage] Successfully deleted image with id: ${id}`);
      return true;
    } catch (error) {
      console.error('[Storage] Error deleting image:', error);
      return false;
    }
  }
}

export const storage = new MemStorage();