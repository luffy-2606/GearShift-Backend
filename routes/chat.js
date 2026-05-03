const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { chat } = require('../controllers/chatController');

const router = express.Router();

router.post('/', authenticateToken, chat);

module.exports = router;
