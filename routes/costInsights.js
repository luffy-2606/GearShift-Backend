const express = require('express');
const CostInsightsController = require('../controllers/costInsightsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All cost insights routes require authentication
router.use(authenticateToken);

// Get cost insights for the authenticated user
router.get('/', CostInsightsController.getCostInsights);

// Get spending trends over time
router.get('/trends', CostInsightsController.getSpendingTrends);

module.exports = router;
