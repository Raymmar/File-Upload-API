import { images, type Image, type InsertImage } from "@shared/schema";
import Database from "@replit/database";

export interface IStorage {
  getBucket(): Promise<string>;
  uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void>;
  getFileUrl(bucket: string, filename: string): Promise<string>;
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getFile(filename: string): Promise<{ buffer: string, contentType: string } | undefined>;
}

export class MemStorage implements IStorage {
  private images: Map<number, Image>;
  private currentId: number;
  private db: Database;

  constructor() {
    this.images = new Map();
    this.currentId = 1;
    this.db = new Database();
  }

  async getBucket(): Promise<string> {
    return 'default-bucket';
  }

  async uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void> {
    // Store file data in Replit Database
    await this.db.set(`file:${filename}`, {
      buffer: buffer.toString('base64'),
      contentType
    });
  }

  async getFile(filename: string): Promise<{ buffer: string, contentType: string } | undefined> {
    const fileData = await this.db.get(`file:${filename}`);
    return fileData as { buffer: string, contentType: string } | undefined;
  }

  async getFileUrl(bucket: string, filename: string): Promise<string> {
    // Generate a URL for accessing the file
    return `/api/files/${filename}`;
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.currentId++;
    const image: Image = { id, ...insertImage };
    this.images.set(id, image);

    // Store image metadata in Replit Database
    await this.db.set(`image:${id}`, image);

    return image;
  }

  async getImage(id: number): Promise<Image | undefined> {
    // Try to get from memory first
    if (this.images.has(id)) {
      return this.images.get(id);
    }

    // Fall back to database
    const image = await this.db.get(`image:${id}`);
    if (image) {
      this.images.set(id, image as Image);
      return image as Image;
    }

    return undefined;
  }
}

export const storage = new MemStorage();