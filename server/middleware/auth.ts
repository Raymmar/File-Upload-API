import { Request, Response, NextFunction } from "express";

// Simple API key check middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    console.error('[Auth] API_KEY environment variable is not set');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (!apiKey) {
    console.warn('[Auth] Request missing API key');
    return res.status(401).json({ success: false, error: 'API key is required' });
  }

  if (apiKey !== expectedApiKey) {
    console.warn('[Auth] Invalid API key provided');
    return res.status(403).json({ success: false, error: 'Invalid API key' });
  }

  next();
};
