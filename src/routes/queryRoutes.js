const express = require('express');
const queryController = require('../controllers/queryController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const queryValidation = require('../validators/query.validation');

const router = express.Router();

// All routes require authentication
router.use(auth());

// Query CRUD operations
router.post('/', validate(queryValidation.createQuery), queryController.createQuery);
router.get('/', validate(queryValidation.getQueries), queryController.getAllQueries);
router.get('/stats', authorize('admin', 'manager'), queryController.getQueryStats);
router.get('/:id', validate(queryValidation.getQuery), queryController.getQueryById);
router.patch('/:id', validate(queryValidation.updateQuery), queryController.updateQuery);
router.delete('/:id', validate(queryValidation.getQuery), queryController.deleteQuery);

// Query workflow operations
router.post('/:id/answers', authorize('manager', 'admin'), validate(queryValidation.addAnswer), queryController.addAnswer);
router.post('/:id/solution', authorize('manager', 'admin'), validate(queryValidation.provideSolution), queryController.provideSolution);
router.patch('/:id/review', authorize('manager', 'admin'), validate(queryValidation.reviewSolution), queryController.reviewSolution);

// Comments
router.post('/:id/comments', validate(queryValidation.addComment), queryController.addComment);

module.exports = router; 