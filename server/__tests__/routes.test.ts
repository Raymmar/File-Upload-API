import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';

describe('Image API Routes', () => {
  let app: express.Express;
  
  beforeAll(async () => {
    app = express();
    await registerRoutes(app);
  });

  describe('GET /api/images', () => {
    it('should return all images', async () => {
      const response = await request(app)
        .get('/api/images')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/upload', () => {
    it('should upload an image successfully', async () => {
      const testImagePath = path.join(__dirname, 'test-assets', 'test-image.jpg');
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('contentType', 'image/jpeg');
    });

    it('should reject when no file is provided', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should reject invalid file types', async () => {
      const testTextPath = path.join(__dirname, 'test-assets', 'test.txt');
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testTextPath)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid file type');
    });
  });

  describe('GET /api/images/:id', () => {
    let testImageId: number;

    beforeAll(async () => {
      // Upload a test image first
      const testImagePath = path.join(__dirname, 'test-assets', 'test-image.jpg');
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath);
      testImageId = response.body.data.id;
    });

    it('should return a single image by id', async () => {
      const response = await request(app)
        .get(`/api/images/${testImageId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testImageId);
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get('/api/images/999999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Image not found');
    });
  });

  describe('DELETE /api/images/:id', () => {
    let testImageId: number;

    beforeEach(async () => {
      // Upload a test image first
      const testImagePath = path.join(__dirname, 'test-assets', 'test-image.jpg');
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testImagePath);
      testImageId = response.body.data.id;
    });

    it('should delete an image successfully', async () => {
      const response = await request(app)
        .delete(`/api/images/${testImageId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testImageId);

      // Verify the image is actually deleted
      const getResponse = await request(app)
        .get(`/api/images/${testImageId}`)
        .expect(404);
    });

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .delete('/api/images/999999')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Image not found or could not be deleted');
    });
  });
});
