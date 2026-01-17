import multer from 'multer';

// Use memory storage so we can buffer directly to Cloudinary
const storage = multer.memoryStorage();

const uploadDocument = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.'), false);
        }
    }
});

export default uploadDocument;
