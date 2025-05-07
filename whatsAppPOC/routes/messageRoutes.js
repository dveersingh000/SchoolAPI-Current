// // routes/messageRoutes.js

// const express = require('express');
// const router = express.Router();
// const messageController = require('../controllers/messageController');

// router.post('/', messageController.sendMessage);

// module.exports = router;


// routes/messageRoutes.js

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// POST route to receive incoming messages from WhatsApp API
router.post('/webhook', async (req, res) => {
    try {
        const { from, body } = req.body; // Extract sender's phone number and message body
        const tenant = getTenant(from); // Identify tenant based on sender's phone number
        await whatsappService.receiveWhatsAppMessage(from, body); // Process incoming message
        res.status(200).send('Message processed successfully');
    } catch (error) {
        console.error('Error processing incoming message:', error);
        res.status(500).send('Internal server error');
    }
});

// Function to identify tenant based on phone number
const getTenant = (phoneNumber) => {
    // Implement logic to determine tenant based on phone number
    // This might involve a database lookup or mapping
    // For demonstration, we'll use a simple mapping
    const tenantMap = {
        '+1234567890': 'tenant1',
        '+9876543210': 'tenant2'
        // Add more mappings as needed
    };
    return tenantMap[phoneNumber] || 'default'; // Default tenant if not found
};

module.exports = router;
