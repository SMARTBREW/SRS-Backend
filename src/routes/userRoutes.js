const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const authValidation = require('../validators/auth.validator');
const userValidation = require('../validators/user.validation');

const router = express.Router();

// Authentication routes
router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(auth());

// Profile routes
router.get('/profile', authController.getProfile);
router.patch('/profile', authController.updateProfile);
router.patch('/change-password', authController.changePassword);

// User management routes (admin/manager only)
router.get('/', authorize('admin', 'manager'), userController.getAllUsers);
router.get('/stats', authorize('admin', 'manager'), userController.getUserStats);
router.get('/:id', authorize('admin', 'manager'), validate(userValidation.getUser), userController.getUserById);
router.post('/', authorize('admin'), validate(userValidation.createUser), userController.createUser);
router.patch('/:id', authorize('admin'), validate(userValidation.updateUser), userController.updateUser);
router.delete('/:id', authorize('admin'), validate(userValidation.deleteUser), userController.deleteUser);
router.patch('/:id/status', authorize('admin', 'manager'), userController.updateUserStatus);

module.exports = router; 