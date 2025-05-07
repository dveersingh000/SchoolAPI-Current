// routes/tenantRoutes.js

const express = require('express');
const router = express.Router(); // Ensure you're using express.Router() here

// Import the tenant controller
const tenantController = require('../controllers/tenantController');

// Define routes
// Example route definition
// router.get('/', tenantController.getTenants);

module.exports = router; // Export the router object
