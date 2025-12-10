
/**
 * Small async wrapper to forward errors to Express error handler
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    next(err);
  }
};

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const {
  upload, // multer instance from your controller (keeps existing behavior)
  uploadImage,
  uploadBase64Image,
  uploadProductImage,
  uploadMockupTemplate,
  deleteUploadedImage
} = require('../controllers/uploadController');
/**
 * Upload theme poster image (admin only)
 * - expects themeId in body
 * - single file field 'image'
 */
// Removed themeController import and theme-poster route

/**
 * Validation result handler middleware
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // send first error in a consistent shape
    return res.status(422).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
};

/**
 * Utility validator for Mongo ObjectId (simple check)
 */
const isObjectId = value => /^[0-9a-fA-F]{24}$/.test(value);

/* -------------------------
   Routes
   ------------------------- */

/**
 * Upload single image (authenticated users)
 * - rate limited
 */
router.post(
  '/image',
  authMiddleware,
  uploadLimiter,
  // accept both `image` (single) and `images` (array) field names from frontend
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]),
  asyncHandler(uploadImage)
);

/**
 * Upload base64 image (for custom designs)
 * - validates that body.image exists and is a non-empty string
 * - rate limited
 */
router.post(
  '/base64',
  authMiddleware,
  uploadLimiter,
  body('image').isString().trim().notEmpty().withMessage('image (base64) is required'),
  handleValidation,
  asyncHandler(uploadBase64Image)
);

/**
 * Upload product variant image (admin only)
 * - validate productId & variantId
 * - single file field 'image'
 */
router.post(
  '/product/:productId/variant/:variantId',
  authMiddleware,
  adminMiddleware,
  param('productId')
    .custom(isObjectId)
    .withMessage('Invalid productId format'),
  param('variantId')
    .custom(isObjectId)
    .withMessage('Invalid variantId format'),
  handleValidation,
  upload.single('image'),
  asyncHandler(uploadProductImage)
);

/**
 * Upload mockup template (admin only)
 * - validate productId
 * - single file field 'mockup'
 */
router.post(
  '/mockup/:productId',
  authMiddleware,
  adminMiddleware,
  param('productId')
    .custom(isObjectId)
    .withMessage('Invalid productId format'),
  handleValidation,
  upload.single('mockup'),
  asyncHandler(uploadMockupTemplate)
);

/**
 * Delete uploaded image
 * - validate publicId param (non-empty)
 */
router.delete(
  '/:publicId',
  authMiddleware,
  param('publicId').trim().notEmpty().withMessage('publicId is required'),
  handleValidation,
  asyncHandler(deleteUploadedImage)
);

module.exports = router;
