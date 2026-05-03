const express = require('express');
const MechanicController = require('../controllers/mechanicController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get mechanics list (display only) - no auth required for testing
router.get('/', MechanicController.getMechanics);

// All other mechanic routes require authentication
router.use(authenticateToken);

module.exports = router;
