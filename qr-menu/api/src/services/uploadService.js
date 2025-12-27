import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'restaurant-menu-items',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ]
    }
});

// Create thumbnail transformation
const thumbnailStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'restaurant-menu-items/thumbnails',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'auto' },
            { quality: 'auto:low' },
            { fetch_format: 'auto' }
        ]
    }
});

// File filter for validation
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
    }
};

// Multer upload middleware
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

/**
 * Upload image to Cloudinary
 * @param {File} file - Multer file object
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImage = async (file) => {
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        return {
            url: file.path,
            publicId: file.filename
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
    }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
export const deleteImage = async (publicId) => {
    try {
        if (!publicId) {
            return;
        }

        await cloudinary.uploader.destroy(publicId);
        console.log(`Image deleted: ${publicId}`);
    } catch (error) {
        console.error('Error deleting image:', error);
        // Don't throw error, just log it
    }
};

/**
 * Generate thumbnail URL from original image
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (publicId) => {
    if (!publicId) return '';

    return cloudinary.url(publicId, {
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'auto' },
            { quality: 'auto:low' },
            { fetch_format: 'auto' }
        ]
    });
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {boolean}
 */
export const validateImage = (file) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file) {
        throw new Error('No file provided');
    }

    if (!allowedMimes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
    }

    if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
    }

    return true;
};

export default {
    upload,
    uploadImage,
    deleteImage,
    getThumbnailUrl,
    validateImage,
    cloudinary
};
