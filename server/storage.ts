import { images, type Image, type InsertImage } from "@shared/schema";
import Database from "@replit/database";

export interface IStorage {
  getBucket(): Promise<string>;
  uploadFile(bucket: string, filename: string, buffer: Buffer, contentType: string): Promise<void>;
  getFileUrl(bucket: string, filename: string): Promise<string>;
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getFile(filename: string): Promise<{ buffer: string, contentType: string } | undefined>;
  getImages(): Promise<Image[]>;
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
    const fileData = {
      buffer: buffer.toString('base64'),
      contentType
    };

    console.log(`Storing file ${filename} with contentType ${contentType}`);
    await this.db.set(`file:${filename}`, fileData);
  }

  async getFile(filename: string): Promise<{ buffer: string, contentType: string } | undefined> {
    console.log(`Retrieving file ${filename}`);
    const fileData = await this.db.get(`file:${filename}`);
    if (!fileData) {
      console.log(`File ${filename} not found`);
      return undefined;
    }

    console.log(`Found file ${filename} with contentType ${fileData.contentType}`);
    return fileData as { buffer: string, contentType: string };
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

  async getImages(): Promise<Image[]> {
    try {
      // Get all keys from the database
      const allKeys = await this.db.list();
      console.log('All keys from database:', allKeys);

      // Convert the result to an array and filter image keys
      const imageKeys = Object.keys(allKeys as object).filter(key => key.startsWith('image:'));
      console.log('Filtered image keys:', imageKeys);

      // Fetch all images
      const images: Image[] = [];
      for (const key of imageKeys) {
        const image = await this.db.get(key);
        if (image) {
          images.push(image as Image);
        }
      }

      console.log(`Found ${images.length} images`);
      return images;
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }
}

export const storage = new MemStorage();