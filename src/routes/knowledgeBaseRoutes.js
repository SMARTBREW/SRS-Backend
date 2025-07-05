const express = require('express');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const knowledgeBaseValidation = require('../validators/knowledgeBase.validation');

const router = express.Router();

// Public routes (no authentication required)
router.get('/search', validate(knowledgeBaseValidation.searchKnowledgeBase), knowledgeBaseController.searchKnowledgeBase);

// All other routes require authentication
router.use(auth());

// Knowledge base CRUD operations
router.post('/', authorize('admin', 'manager'), validate(knowledgeBaseValidation.createKnowledgeBase), knowledgeBaseController.createKnowledgeBaseEntry);
router.get('/', validate(knowledgeBaseValidation.getKnowledgeBase), knowledgeBaseController.getAllKnowledgeBase);
router.get('/:id', validate(knowledgeBaseValidation.getKnowledgeBaseEntry), knowledgeBaseController.getKnowledgeBaseById);
router.patch('/:id', authorize('admin', 'manager'), validate(knowledgeBaseValidation.updateKnowledgeBase), knowledgeBaseController.updateKnowledgeBase);
router.delete('/:id', authorize('admin'), validate(knowledgeBaseValidation.getKnowledgeBaseEntry), knowledgeBaseController.deleteKnowledgeBase);

// Rating and feedback
router.post('/:id/rate', validate(knowledgeBaseValidation.rateKnowledgeBase), knowledgeBaseController.rateKnowledgeBase);

module.exports = router; 