# Storage Media Module - S3 Integration

## Overview

This module handles file uploads to AWS S3-compatible storage (Supabase Storage) with support for organizing files into folders.

## Features

- ✅ Upload files to S3-compatible storage
- ✅ 2MB file size limit per upload
- ✅ Automatic folder organization (documents/images)
- ✅ Unique filename generation using UUID
- ✅ Presigned URLs for secure file access

## Configuration

Ensure these environment variables are set in your `.env` file:

```env
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_ENDPOINT=your_s3_endpoint
S3_REGION=your_region
S3_BUCKET_NAME=your_bucket_name
```

## API Endpoints

### 1. Upload File

**POST** `/api/v1/storage-media/upload?type=documents`

**Query Parameters:**

- `type` (optional): `documents` or `images` (defaults to `documents`)

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field

**Response:**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "key": "documents/uuid-123.pdf",
    "filename": "uuid-123.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "folder": "documents",
    "url": "https://your-endpoint/bucket/documents/uuid-123.pdf"
  }
}
```

**Example using cURL:**

```bash
# Upload to documents folder
curl -X POST http://localhost:3030/api/v1/storage-media/upload?type=documents \
  -F "file=@/path/to/your/file.pdf"

# Upload to images folder
curl -X POST http://localhost:3030/api/v1/storage-media/upload?type=images \
  -F "file=@/path/to/your/image.jpg"
```

### 2. Get File

**GET** `/api/v1/storage-media/:folder/:filename`

**Parameters:**

- `folder`: `documents` or `images`
- `filename`: The filename returned from upload

**Example:**

```
GET /api/v1/storage-media/documents/uuid-123.pdf
```

This endpoint redirects to a presigned S3 URL that's valid for 1 hour.

## File Size Limits

- Maximum file size: **2MB per upload**
- Exceeding this limit will result in a 413 error

## Folder Structure

Files are automatically organized into two folders:

- `documents/` - For PDF, DOC, TXT, and other document types
- `images/` - For JPG, PNG, GIF, and other image types

## Security

- All files are stored with unique UUID-based filenames
- Original filenames are never exposed
- Presigned URLs expire after 1 hour
- Public endpoints for upload and retrieval
