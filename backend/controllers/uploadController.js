// controllers/uploadController.js
const multer = require('multer');
const path = require('path');
const { uploadFromBuffer, uploadFromBase64, deleteImage } = require('../utils/cloudinary');
const Product = require('../models/Product');

/**
 * Multer configuration
 * - memoryStorage keeps files in memory buffers (good for uploading to cloud)
 * - change to diskStorage if you want to store locally
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif'
];

const allowedExt = /jpeg|jpg|png|webp|gif|svg|heic|heif/;

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const ok = allowedMimeTypes.includes(file.mimetype) && allowedExt.test(ext);

    if (!ok) {
      const err = new Error('Unsupported file type. Allowed: jpg, jpeg, png, webp, gif, svg, heic, heif');
      err.statusCode = 400;
      return cb(err);
    }

    cb(null, true);
  }
});

/**
 * NOTE:
 * Each exported controller returns a plain object (or throws).
 * The router is responsible for sending HTTP responses.
 *
 * Implement real upload/delete logic where the TODO comments are.
 */

async function uploadImage(req) {
  // Debug: log incoming files and body
  console.log('uploadImage: req.files =', req.files);
  console.log('uploadImage: req.body =', req.body);
  if (req.fileValidationError) {
    const err = new Error(req.fileValidationError);
    err.statusCode = 400;
    throw err;
  }
  // Support both single (image) and multiple (images) field names
  const fromArray = Array.isArray(req.files) ? req.files : [];
  const fromFields = req.files && typeof req.files === 'object'
    ? [...(req.files.images || []), ...(req.files.image || [])]
    : [];
  const files = fromFields.length ? fromFields : (fromArray.length ? fromArray : (req.file ? [req.file] : []));

  if (!files.length) {
    const err = new Error('No files uploaded. Ensure form field name is "image" or "images".');
    err.statusCode = 400;
    throw err;
  }

  // Save file info for local storage
  const uploadedFiles = files.map((file) => {
    return {
      originalname: file.originalname,
      size: file.size,
      url: `/uploads/${file.filename}`,
      localPath: path.join('public/uploads', file.filename)
    };
  });

  return {
    count: uploadedFiles.length,
    files: uploadedFiles
  };
}

async function uploadBase64Image(req) {
  const dataUri = (req.body && req.body.image) || '';
  if (!dataUri) throw new Error('No image provided');

  // Basic data URI parse: data:<mime>;base64,<payload>
  const matches = dataUri.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid data URI');

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const result = await uploadFromBase64(dataUri, { folder: 'custom-designs' });

  return {
    mimeType,
    size: buffer.length,
    url: result.secure_url,
    publicId: result.public_id
  };
}

async function uploadProductImage(req) {
  const { productId, variantId } = req.params;
  const file = req.file;
  if (!file) throw new Error('No image uploaded (field name should be "image")');

  // Upload to Cloudinary
  const result = await uploadFromBuffer(file.buffer, { folder: 'product-images' });

  // Find and update the product variant
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const variant = product.variants.id(variantId);
  if (!variant) throw new Error('Variant not found');

  // Add image to variant
  variant.images.push({
    url: result.secure_url,
    publicId: result.public_id,
    isPrimary: variant.images.length === 0 // First image is primary by default
  });

  await product.save();

  return {
    originalname: file.originalname,
    size: file.size,
    url: result.secure_url,
    publicId: result.public_id,
    variantId: variantId
  };
}

async function uploadMockupTemplate(req) {
  const file = req.file;
  if (!file) throw new Error('No mockup uploaded (field name should be "mockup")');

  // TODO: upload `file.buffer` and save template metadata in DB
  return { originalname: file.originalname, size: file.size };
}

async function deleteUploadedImage(req) {
  const publicId = req.params.publicId;
  if (!publicId) throw new Error('publicId required');

  // TODO: delete from storage (Cloudinary/S3) and remove DB record if any
  return { deleted: true, publicId };
}

module.exports = {
  upload, // multer instance (important)
  uploadImage,
  uploadBase64Image,
  uploadProductImage,
  uploadMockupTemplate,
  deleteUploadedImage
};
