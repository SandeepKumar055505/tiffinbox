import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

/**
 * Sovereign Cloudinary Integration
 * Handles high-fidelity image manifests for 'Proof of Delivery' 
 * while preserving DB storage and ensuring world-class availability.
 */

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const cloudinaryService = {
  /**
   * Upload an image manifest to the Cloudinary vault.
   * Returns the secure URL for 'Ground Truth' anchoring.
   */
  async upload(base64Image: string, folder: string = 'deliveries'): Promise<string> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
      console.warn('Cloudinary not configured — falling back to local simulation.');
      return `/simulated_uploads/${Date.now()}.jpg`;
    }

    try {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: `tiffinbox/${folder}`,
        resource_type: 'image',
        quality: 'auto:eco',
      });
      return result.secure_url;
    } catch (error: any) {
      console.error('Cloudinary manifest error:', error);
      throw new Error('ERR_CLOUDINARY_DRIFT');
    }
  },

  /**
   * Remove an image trace from the cloud vault.
   */
  async remove(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
       console.error('Cloudinary deletion failed:', error);
    }
  }
};
