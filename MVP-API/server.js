require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const User = require('./models/User');
const Property = require('./models/Property');
const bcrypt = require('bcrypt');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure as needed
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const cors = require('cors') ; 

app.use(cors()) ;
app.use(express.json());

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});


// Database Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));


app.post('/signup/step1', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).send('User already exists with the given email.');
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create user with initial details
        const user = new User({
            username,
            email,
            password: hashedPassword,
        });
        await user.save();
        // Send verification email or token logic here
        res.status(201).send({ message: 'User created', userId: user._id });
    } catch (error) {
        console.log(error) ;
        res.status(500).send('Server error');
    }
});

app.post('/signup/step2', async (req, res) => {
    const { userId, pin } = req.body;
    try {
        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).send('PIN must be 4 numeric values.');
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }
        user.pin = pin;
        await user.save();
        res.send({ message: 'PIN saved successfully.' });
    } catch (error) {
        res.status(500).send('Server error');
    }
});


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/photos');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const photoUpload = multer({ storage: storage }).single('photo');

app.post('/signup/step3', photoUpload, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }
        user.photo = req.file.path;
        await user.save();
        res.send({ message: 'Photo uploaded successfully.' });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

const storage2 = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/residanceProof');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const proofUpload2 = multer({ storage: storage2 }).single('proofOfResidence');

app.post('/signup/step4', proofUpload2, async (req, res) => {
    const { userId, country } = req.body; // Assuming these are passed along with the form-data
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }
        user.proofOfResidence = req.file.path;
        user.country = country;
        await user.save();
        res.send({ message: 'Proof of residence uploaded and country saved successfully.' });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Verify Email HERE
// app.post('/verify-email', async (req, res) => {
//     const { userId, verificationCode } = req.body;
//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).send('User not found.');
//         }
//         if (user.verificationCode === verificationCode) {
//             user.emailVerified = true;
//             await user.save();
//             res.send({ message: 'Email verified successfully.' });
//         } else {
//             res.status(400).send('Invalid verification code.');
//         }
//     } catch (error) {
//         res.status(500).send('Server error');
//     }
// });

app.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if email is verified
        // if (!user.emailVerified) {
        //     return res.status(401).json({ message: 'Email not verified' });
        // }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Signin Successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});



app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a random 4-digit verification code
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        // Save the verification code to the user document in the database
        user.verificationCode = verificationCode;
        await user.save();

        // Compose email
        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'Password Reset Verification Code',
            text: `Your verification code is: ${verificationCode}`
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ message: 'Failed to send verification code' });
            }
            console.log('Email sent: ' + info.response);
            res.json({ message: 'Verification code sent to your email' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// Multer storage configuration
const storage3 = multer.diskStorage({
    destination: function(req, file, cb) {
        // Get the property name from the request body
        const propertyName = req.body.name;
        // Resolve the absolute path for the destination directory
        const dest = path.resolve(`./uploads/properties/${propertyName}`);
        
        // Check if the directory exists, if not, create it
        fs.mkdir(dest, { recursive: true }, function(err) {
            if (err) {
                console.error("Error creating destination directory:", err);
                cb(err, null);
            } else {
                cb(null, dest);
            }
        });
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});



// Multer upload configuration
const upload3 = multer({ storage: storage3 });

app.post('/properties/add', upload3.fields([
    { name: 'areaReport', maxCount: 1 },
    { name: 'projectionReport', maxCount: 1 },
    { name: 'memorandum', maxCount: 1 },
    { name: 'propertyReport', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            name,
            price,
            location,
            type,
            status,
            bedrooms,
            toilets,
            area,
            description,
            about,
            amenities
        } = req.body;

        // Create a directory for the property if it doesn't exist
        const propertyDirectory = path.join('./uploads/properties', name);
        if (!fs.existsSync(propertyDirectory)) {
            fs.mkdirSync(propertyDirectory, { recursive: true }); // Ensure creation of parent directories if they don't exist
        }

        const property = new Property({
            name,
            price,
            location,
            type,
            status,
            bedrooms,
            toilets,
            area,
            description,
            about,
            amenities,
            areaReport: path.join('/uploads/properties', name, req.files['areaReport'][0].filename),
            projectionReport: path.join('/uploads/properties', name, req.files['projectionReport'][0].filename),
            memorandum: path.join('/uploads/properties', name, req.files['memorandum'][0].filename),
            propertyReport: path.join('/uploads/properties', name, req.files['propertyReport'][0].filename)
        });

        await property.save();

        res.status(201).json({ message: 'Property added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Server error' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
