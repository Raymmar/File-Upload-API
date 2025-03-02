import { images, type Image, type InsertImage } from "@shared/schema";
import { Client } from '@replit/object-storage';

export interface IStorage {
  getBucket(): Promise<string>;
  uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void>;
  getFileUrl(bucket: string, filename: string): Promise<string>;
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getImages(): Promise<Image[]>;
}

export class MemStorage implements IStorage {
  private images: Map<number, Image>;
  private currentId: number;
  private client: Client;

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
      console.log(`[Storage] Starting upload for file: ${filename}`);
      console.log(`[Storage] File size: ${buffer.length} bytes`);
      console.log(`[Storage] Content type: ${contentType}`);

      const { ok, error } = await this.client.uploadFromBytes(filename, buffer);

      if (!ok) {
        console.error('[Storage] Upload failed:', error);
        throw new Error(`Failed to upload file: ${error}`);
      }

      console.log(`[Storage] Upload successful for file: ${filename}`);
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
  }

  async getFileUrl(bucket: string, filename: string): Promise<string> {
    try {
      console.log(`[Storage] Getting URL for file: ${filename}`);

      // Get Replit environment variables
      const replId = process.env.REPL_ID;
      const replSlug = process.env.REPL_SLUG;

      if (!replId || !replSlug) {
        throw new Error('Missing required Replit environment variables');
      }

      // Construct the public URL using Replit's Object Storage URL format
      const url = `https://${replSlug}.${replId}.repl.co/files/${encodeURIComponent(filename)}`;
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
        filename: insertImage.filename,
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
      const images = Array.from(this.images.values());
      console.log(`[Storage] Returning ${images.length} images`);
      return images;
    } catch (error) {
      console.error('[Storage] Error fetching images:', error);
      return [];
    }
  }
}

export const storage = new MemStorage();