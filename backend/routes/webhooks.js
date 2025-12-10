const express = require('express');
const router = express.Router();

const { handleRazorpayWebhook } = require('../controllers/webhookController');

// Razorpay webhook endpoint (no auth required)
router.post('/razorpay', 
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  handleRazorpayWebhook
);

module.exports = router;