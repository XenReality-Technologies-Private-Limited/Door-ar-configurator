// server.js (Node.js + Express + AWS SDK v3)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// allow cross-origin from your frontend
app.use(cors());
// raw body for octet-stream
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// init S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET = process.env.S3_BUCKET;
const CLOUDFRONT = process.env.CLOUDFRONT_URL; // e.g. https://<your>.cloudfront.net

app.post('/upload-glb', async (req, res) => {
  const buffer = req.body;
  if (!buffer || !buffer.length) {
    return res.status(400).json({ error: 'No data received.' });
  }

  // create unique key
  const key = `doors/${Date.now()}-${Math.random().toString(36).substr(2,8)}.glb`;

  console.log("key", key);
  console.log("bucket", BUCKET);
  console.log("key", key);


  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'model/gltf-binary',
    //   ACL:
    // 
    //  'public-read'
    }));

    const url = `${CLOUDFRONT}/${key}`;
    console.log("utl", url);

    res.json({ url });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: 'Upload to S3 failed.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));