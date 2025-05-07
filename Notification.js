const express = require('express');
const FCM = require('fcm-node');
const bodyParser = require('body-parser');
const cors = require('cors')
const app = express();
app.use(cors());
const serverKey = 'AAAAqDM3Zpg:APA91bFHWpKpuDCTRIZBEat0Oiu8cguBmFEbRRlQ1L7mEA2eLyjMa5IYpWLnmLf9q0LAX-Z8wqHyVZuxjDuAwxNGy3uqR9jnnfueoQreRhjoD4jGzTIiQS6qUSS_JpY5LYX3PGb0hxyr';
const fcm = new FCM(serverKey);

app.use(bodyParser.json());

app.post('/send-notification', (req, res) => {
    const { to, title, body } = req.body;

    const message = {
        to,
        notification: {
            title: title || 'Default Title',
            body: body || 'Default Body',
        },
        data: {
            title: 'ok cdfsdsdfsd',
            body: '{"name" : "okg ooggle ogrlrl","product_id" : "123","final_price" : "0.00035"}'
        }
    };

    fcm.send(message, (err, response) => {
        if (err) {
            console.error("Something has gone wrong! " + err);
            res.status(500).json({ error: 'Failed to send notification' });
        } else {
            console.log("Successfully sent with response: ", response);
            res.json({ success: true, response });
        }
    });
});


app.post('/sendmulti-notification', (req, res) => {
const { to, title, body } = req.body;

    if (!Array.isArray(to)) {
        return res.status(400).json({ error: 'Invalid format for "to" field. It should be an array.' });
    }

    const messages = to.map((recipient) => {
        return {
            to: recipient,
            notification: {
                title: title || 'Default Title',
                body: body || 'Default Body',
            },
            data: {
                title: 'ok cdfsdsdfsd',
                body: '{"name" : "okg ooggle ogrlrl","product_id" : "123","final_price" : "0.00035"}',
            },
        };
    });

    // Send messages one by one
    messages.forEach((message, index) => {
        fcm.send(message, (err, response) => {
            if (err) {
                console.error(`Failed to send message ${index}:`, err);
            } else {
                console.log(`Message ${index} sent successfully with response:`, response);
            }
        });
    });

    res.json({ success: true });
});


const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
