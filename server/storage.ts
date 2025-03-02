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
  }

  async getBucket(): Promise<string> {
    return 'default-bucket';
  }

  async uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void> {
    console.log(`Uploading file ${filename} with contentType ${contentType}`);
    const { ok, error } = await this.client.uploadFromBytes(filename, buffer);

    if (!ok) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  async getFile(filename: string): Promise<{ buffer: Buffer, contentType: string } | undefined> {
    console.log(`Retrieving file ${filename}`);
    const { ok, value: buffer, error } = await this.client.downloadAsBytes(filename);

    if (!ok) {
      console.error('Download error:', error);
      return undefined;
    }

    // For simplicity, we'll determine content type from the filename
    const contentType = filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') 
      ? 'image/jpeg' 
      : filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'application/octet-stream';

    return { buffer, contentType };
  }

  async getFileUrl(bucket: string, filename: string): Promise<string> {
    // The URL will be handled by our API endpoint
    return `/api/files/${encodeURIComponent(filename)}`;
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.currentId++;
    const image: Image = { id, ...insertImage };
    this.images.set(id, image);
    return image;
  }

  async getImage(id: number): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async getImages(): Promise<Image[]> {
    try {
      // List all objects in the bucket
      const { ok, value: objects, error } = await this.client.list();

      if (!ok) {
        console.error('Error listing objects:', error);
        return [];
      }

      // Convert objects to images
      const images = Array.from(this.images.values());
      console.log(`Found ${images.length} images`);

      return images;
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }
}

export const storage = new MemStorage();