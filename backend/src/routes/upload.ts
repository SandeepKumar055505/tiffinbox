import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const enabled = !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (enabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// POST /api/upload/meal-image — accepts base64 data URL, returns hosted URL
router.post('/meal-image', requireAdmin, async (req, res) => {
  if (!enabled) {
    return res.status(503).json({ error: 'Image upload not configured (missing Cloudinary env vars)' });
  }

  const { data } = req.body; // base64 data URL: "data:image/jpeg;base64,..."
  if (!data || !data.startsWith('data:image/')) {
    return res.status(422).json({ error: 'Invalid image data' });
  }

  try {
    const result = await cloudinary.uploader.upload(data, {
      folder: 'tiffinbox/meals',
      transformation: [{ width: 600, height: 400, crop: 'fill', quality: 'auto' }],
    });
    res.json({ url: result.secure_url });
  } catch (err: any) {
    console.error('[upload error]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
