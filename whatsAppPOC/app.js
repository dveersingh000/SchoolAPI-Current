// app.js

const express = require('express');
const app = express();
const PORT = 7000;
const { sendWhatsAppMessage } = require('./services/whatsappService');

// Middleware
app.use(express.json());

// Routes
const messageRoutes = require('./routes/messageRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

// Route for handling incoming messages from WhatsApp API
app.post('/webhook', async (req, res) => {
    // Handle incoming message
    const { from, body } = req.body;
    console.log('Received message:', { from, body });

    try {
        // Send response
        const responseMessage = `You sent: ${body}. Thank you for your message!`;
        
        // Send response message to the sender
        await sendWhatsAppMessage(from, responseMessage);

        // Send success response
        res.status(200).json({ message: 'Response sent successfully' });
    } catch (error) {
        console.error('Error sending response:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Use other routes
app.use('/messages', messageRoutes);
app.use('/tenants', tenantRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
