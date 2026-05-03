const express = require('express');
const ShopController = require('../controllers/shopController');

const router = express.Router();

// Public routes - no authentication required
router.get('/', ShopController.getShops);
router.get('/:shopId', ShopController.getShopDetails);
router.get('/:shopId/availability', ShopController.getShopAvailability);

module.exports = router;
