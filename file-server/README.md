# Video Streaming File Server

A Node.js Express server that provides video streaming capabilities with thumbnail generation, authentication, and range request support.

## Features

- **Video Library Management**: Automatically scans and indexes video files
- **Thumbnail Generation**: Creates video thumbnails using FFmpeg
- **Authentication**: Access code-based authentication (default: 1776)
- **Video Streaming**: HTTP range request support for efficient streaming
- **RESTful API**: Complete API for video management and streaming
- **Security**: JWT tokens, rate limiting, CORS protection

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed and accessible in PATH
- Video files in supported formats (MP4, AVI, MKV, MOV, WebM)

## Installation

1. Navigate to the file-server directory:
```bash
cd file-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure the server by editing `config/config.json`:
```json
{
  "port": 3001,
  "videoFolder": "C:/Videos",
  "accessCode": "1776"
}
```

4. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Configuration

Edit `config/config.json` to customize:

- `videoFolder`: Path to your video files
- `accessCode`: Authentication code (default: 1776)
- `port`: Server port (default: 3001)
- `corsOrigins`: Allowed origins for CORS
- `supportedFormats`: Video file extensions to scan

## API Endpoints

### Authentication
- `POST /auth/login` - Login with access code
- `POST /auth/verify` - Verify JWT token
- `POST /auth/logout` - Logout

### Videos
- `GET /api/videos` - Get all videos with thumbnails
- `GET /api/videos/:id` - Get specific video details
- `GET /api/videos/search/:query` - Search videos
- `GET /api/videos/categories/all` - Get videos by category
- `POST /api/videos/:id/thumbnail` - Generate thumbnail
- `POST /api/videos/refresh` - Refresh video library

### Streaming
- `GET /api/stream/:id` - Stream video with range support
- `GET /api/stream/:id/info` - Get video streaming info
- `GET /api/stream/:id/download` - Download video file

### Health
- `GET /health` - Server health check

## Usage

1. Place video files in the configured video folder
2. Start the server
3. The server will automatically scan and index videos
4. Access the API using the authentication endpoints
5. Stream videos using the streaming endpoints

## Security

- Access code authentication required for all video operations
- JWT tokens for session management
- Rate limiting to prevent abuse
- CORS protection
- Helmet security headers

## Troubleshooting

### FFmpeg Issues
- Ensure FFmpeg is installed and in your system PATH
- Test FFmpeg: `ffmpeg -version`

### Video Not Found
- Check that video files are in the configured folder
- Verify file permissions
- Check supported formats in config

### Thumbnail Generation Fails
- Verify FFmpeg installation
- Check video file integrity
- Ensure write permissions to thumbnail folder

## Development

The server uses:
- Express.js for HTTP server
- FFmpeg for video processing
- JWT for authentication
- Fluent-ffmpeg for video operations

File structure:
```
file-server/
├── src/
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── config/              # Configuration files
├── thumbnails/          # Generated thumbnails
└── server.js           # Main server file