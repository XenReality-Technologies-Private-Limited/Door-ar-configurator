// server.js (Node.js + Express + AWS SDK v3)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT is not set

// IMPORTANT: Configure CORS
// This allows your frontend (running on a different port/domain) to make requests
// Adjust the origin '*' to your specific frontend URL in production for better security.
app.use(cors());

// Middleware to parse raw binary data (octet-stream)
// The GLB file is sent as a binary blob
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' })); // Adjust limit as needed

// Initialize S3 client
// Ensure your .env file has AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Ensure your .env file has S3_BUCKET and CLOUDFRONT_URL
const BUCKET = process.env.S3_BUCKET;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL; // e.g. https://<your>.cloudfront.net

if (!BUCKET || !CLOUDFRONT_URL || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("Missing required environment variables!");
    console.error("Please ensure .env contains: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, CLOUDFRONT_URL");
    process.exit(1); // Exit if configuration is incomplete
}


// POST endpoint to receive and upload the GLB file
app.post('/upload-glb', async (req, res) => {
  // --- ADD THESE LOGS ---
  console.log('Received POST to /upload-glb');
  console.log('Request Body received. Type:', typeof req.body);
  console.log('Request Body Length:', req.body ? req.body.byteLength : 'No body received or body is not a Buffer');
  console.log('Request Headers Content-Type:', req.headers['content-type']); // Log the received Content-Type
  // --- END ADD LOGS ---
  
  const buffer = req.body; // The raw binary buffer is available here
  if (!buffer || !buffer.length) {
    return res.status(400).json({ error: 'No data received. Body is empty.' });
  }

  // Create a unique key for the S3 object to avoid overwriting
  // Using a timestamp and a random string
  const key = `scaled-doors/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.glb`;

  console.log(`Attempting to upload to S3 Bucket: ${BUCKET} with Key: ${key}`);

  try {
    // Upload the buffer to S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer, // The binary GLB data
      ContentType: 'model/gltf-binary', // Standard MIME type for GLB
      // IMPORTANT: You need to configure your S3 bucket policy or
      // use CloudFront Origin Access Control (OAC) to allow CloudFront
      // to access these objects. Setting ACL 'public-read' directly on
      // objects is generally DISCOURAGED for security reasons.
      // Ensure your CloudFront distribution is set up correctly.
      // If you MUST use ACL for testing, uncomment the line below,
      // but prefer bucket policies/OAC for production.
      // ACL: 'public-read'
    }));

    // Construct the publicly accessible URL via CloudFront
    const url = `${CLOUDFRONT_URL}/${key}`;
    console.log(`Upload successful. CloudFront URL: ${url}`);

    // Send the CloudFront URL back to the client
    res.json({ url: url });

  } catch (err) {
    console.error('S3 upload error:', err);
    // Send a 500 Internal Server Error response with details
    res.status(500).json({ error: 'Failed to upload model to storage.', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));