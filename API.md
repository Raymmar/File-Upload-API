# Image Management API Documentation

## Base URL
The API is accessible at: `https://your-repl-name.your-username.repl.co/api`

## Authentication
Currently, the API is open and doesn't require authentication.

## Endpoints

### Upload Image
Upload a new image to the storage.

```
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `file`: Image file (Required)
  - Supported formats: JPEG, PNG
  - Max file size: 5MB

**Example Request:**
```bash
curl -X POST \
  -F "file=@/path/to/your/image.jpg" \
  https://your-repl-name.your-username.repl.co/api/upload
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

### Get All Images
Retrieve a list of all uploaded images.

```
GET /api/images
```

**Example Request:**
```bash
curl https://your-repl-name.your-username.repl.co/api/images
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

### Get Single Image
Retrieve information about a specific image by ID.

```
GET /api/images/:id
```

**Example Request:**
```bash
curl https://your-repl-name.your-username.repl.co/api/images/1
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

### Delete Image
Delete a specific image by ID.

```
DELETE /api/images/:id
```

**Example Request:**
```bash
curl -X DELETE https://your-repl-name.your-username.repl.co/api/images/1
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

### Download/View Image
Get the actual image file.

```
GET /api/storage/:filename
```

**Example Request:**
```bash
curl https://your-repl-name.your-username.repl.co/api/storage/1234567890-image.jpg
```

**Response:**
- Returns the image file directly
- Appropriate content-type header will be set (image/jpeg, image/png)
- Includes caching headers for better performance

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:
- 400: Bad Request (invalid input)
- 404: Not Found (image or resource doesn't exist)
- 500: Internal Server Error

## File Size and Type Restrictions
- Maximum file size: 5MB
- Supported image formats: JPEG, PNG
- Filenames are automatically sanitized and timestamped

## Notes
- All URLs returned in the API responses are relative paths. Prepend your base URL to get the full URL.
- Images are served with a 1-year cache duration for better performance.
- Filenames are automatically sanitized to remove special characters and spaces.
