// controllers/messageController.js

const { sendWhatsAppMessage } = require('../services/whatsappService');

const sendMessage = async (req, res) => {
    const { recipient, message } = req.body;

    try {
        const result = await sendWhatsAppMessage(recipient, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};

module.exports = { sendMessage };
