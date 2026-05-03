const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} = require('../controllers/bookmarkController');

const router = express.Router();

router.use(authenticateToken);

router.get('/', listBookmarks);
router.post('/', createBookmark);
router.patch('/:id', updateBookmark);
router.delete('/:id', deleteBookmark);

module.exports = router;
