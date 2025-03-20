# Replit File Upload API

This is a simple image upload and management API designed to provide secure and efficient file storage for various prototype applications being built by Raymmar Tirado. 

It's a sandbox API for uploading images and passing back a hosted URL to make media management simpler for different projects. You can clone this code, or copy the repl to implement this in your own projects. 

## Features

- **File Storage**: Upload and manage images with secure API key authentication
- **UI**: TypeScript/React frontend for a responsive and intuitive user experience
- **Security**: Express backend with API key authentication and request validation
- **Storage**: Uses Replit Object Storage for reliable and scalable image storage
- **Copy-to-Clipboard**: Intelligent URL generation for sharing images in production environments

## Environment Configuration

The application uses simple environment variables for URL configuration:

```
# .env file
VITE_PRODUCTION_DOMAIN=your-app-name.replit.app
```

This ensures that copied image URLs will use the correct production domain when shared.

## API Documentation

### Base URL
The API is accessible at: `https://file-upload.replit.app/api`

### Authentication
Protected endpoints require an API key to be included in the request headers:
```
X-API-KEY: your-api-key-here
```

### Endpoints

#### Upload Image
Upload a new image to the storage.

```
POST /api/upload
Content-Type: multipart/form-data
X-API-KEY: your-api-key
```

**Request Body:**
- `file`: Image file (Required)
  - Supported formats: JPEG, JPG, PNG, WebP
  - Max file size: 5MB

**Example Request (zsh/bash):**
```shell
# Using curl
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -H "X-API-KEY: your-api-key" \
  -F "file=@\"./path/to/your/image.jpg\"" \
  https://file-upload.replit.app/api/upload

# Using httpie (alternative)
http -f POST https://file-upload.replit.app/api/upload \
  "X-API-KEY: your-api-key" \
  file@"./path/to/your/image.jpg"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "images/1234567890-image.jpg",
    "url": "/api/storage/1234567890-image.jpg",
    "contentType": "image/jpeg",
    "size": 123456
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "File too large. Maximum file size is 5MB.",
  "code": "FILE_TOO_LARGE"
}
```

#### Get All Images
Retrieve a list of all uploaded images.

```
GET /api/images
X-API-KEY: your-api-key (optional)
```

**Example Request (zsh/bash):**
```shell
# Using curl
curl "https://file-upload.replit.app/api/images"

# Using httpie (alternative)
http GET https://file-upload.replit.app/api/images
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "filename": "images/1234567890-image.jpg",
      "url": "/api/storage/1234567890-image.jpg",
      "contentType": "image/jpeg",
      "size": 123456
    }
  ]
}
```

#### Get Single Image
Retrieve information about a specific image by ID.

```
GET /api/images/:id
X-API-KEY: your-api-key (optional)
```

**Example Request (zsh/bash):**
```shell
# Using curl
curl "https://file-upload.replit.app/api/images/1"

# Using httpie (alternative)
http GET https://file-upload.replit.app/api/images/1
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "images/1234567890-image.jpg",
    "url": "/api/storage/1234567890-image.jpg",
    "contentType": "image/jpeg",
    "size": 123456
  }
}
```

#### Delete Image
Delete a specific image by ID.

```
DELETE /api/images/:id
X-API-KEY: your-api-key
```

**Example Request (zsh/bash):**
```shell
# Using curl
curl -X DELETE \
  -H "X-API-KEY: your-api-key" \
  "https://file-upload.replit.app/api/images/1"

# Using httpie (alternative)
http DELETE https://file-upload.replit.app/api/images/1 \
  "X-API-KEY: your-api-key"
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

#### Download/View Image
Get the actual image file.

```
GET /api/storage/:filename
```

**Example Request (zsh/bash):**
```shell
# Using curl (download file)
curl -O "https://file-upload.replit.app/api/storage/1234567890-image.jpg"

# Using curl (view in browser)
curl "https://file-upload.replit.app/api/storage/1234567890-image.jpg"

# Using httpie
http GET https://file-upload.replit.app/api/storage/1234567890-image.jpg
```

**Response:**
- Returns the image file directly
- Appropriate content-type header will be set (image/jpeg, image/png, image/webp)
- Includes caching headers for better performance

### Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE" 
}
```

The `code` field is optional and provides a machine-readable identifier for the error type.

Common Error Codes:
- `UNAUTHORIZED`: Missing API key when required
- `INVALID_API_KEY`: The provided API key is invalid
- `FILE_TOO_LARGE`: The uploaded file exceeds the maximum allowed size
- `INVALID_FILE_TYPE`: The uploaded file is not an accepted image format
- `NOT_FOUND`: The requested resource does not exist
- `SERVER_ERROR`: An internal server error occurred
- `UPLOAD_ERROR`: A generic error occurred during upload

Common HTTP Status Codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing API key)
- 403: Forbidden (invalid API key)
- 404: Not Found (image or resource doesn't exist)
- 500: Internal Server Error

## File Size and Type Restrictions
- Maximum file size: 5MB
- Supported image formats: JPEG, JPG, PNG, WebP
- Filenames are automatically sanitized and timestamped

## Using the Web Interface

The web interface provides an intuitive way to:

1. Enter your API key in the secure input field (not stored in localStorage for security)
2. Upload new images with drag-and-drop or file selection
3. View all uploaded images in a responsive gallery
4. Copy image URLs to clipboard with automatic domain correction for production environments
5. Delete images with confirmation dialog

## Development

### Prerequisites
- Node.js and npm installed
- A Replit account for deployment

### Environment Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and configure the production domain
3. Install dependencies with `npm install`
4. Run the application with `npm run dev`

### Technical Architecture
- **Frontend**: React, TypeScript, Shadcn UI, and TailwindCSS
- **Backend**: Express.js with TypeScript
- **Storage**: Replit Object Storage
- **Authentication**: API key-based with secure session management

## License
MIT