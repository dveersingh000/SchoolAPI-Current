// services/whatsappService.js

const axios = require('axios');
const { text } = require('express');
require('dotenv').config();

const apiKey = process.env.WABA_API_KEY;
const apiSecret = process.env.WABA_API_SECRET;
const phoneNumber = process.env.WABA_PHONE_NUMBER;

const sendWhatsAppMessage = async (recipient, message) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${phoneNumber}/messages`,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "text",
                text: {
                    body : message
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response.data);
        throw error;
    }
};

const receiveWhatsAppMessage = async (sender, message) => {
    // Implement logic to process incoming message and prepare response
    // For demonstration, we'll just echo back the received message
    const responseMessage = `Received message from ${sender}: ${message}`;
    // Send response back to sender
    await sendWhatsAppMessage(sender, responseMessage);
};

module.exports = { sendWhatsAppMessage, receiveWhatsAppMessage };
