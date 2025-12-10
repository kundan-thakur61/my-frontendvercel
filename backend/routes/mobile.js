const express = require('express');
const router = express.Router();

const { listCompanies, listModels, getActiveTheme, getThemeByKey } = require('../controllers/mobileController');

// Public endpoints: list companies and models
router.get('/companies', listCompanies);
router.get('/models', listModels);

// Also expose current active theme for frontend to consume
router.get('/themes/active', getActiveTheme);

// Public detail by key/slug
router.get('/themes/:key', getThemeByKey);

module.exports = router;
