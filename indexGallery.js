const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const Client = require('ssh2-sftp-client');

// Middleware to handle file uploads
router.use(fileUpload());

// Function to create a directory if it doesn't exist
const createDirectory = async (sftp, remotePath) => {
    try {
        const stat = await sftp.stat(remotePath);
        if (!stat.isDirectory()) {
            await sftp.mkdir(remotePath, true);
        }
    } catch {
        await sftp.mkdir(remotePath, true);
    }
};

// Function to list files in a directory
const listFiles = async (sftp, remotePath) => {
    try {
        const files = await sftp.list(remotePath);
        return files.map(file => file.name);
    } catch (err) {
        console.error(err);
        return [];
    }
};

// Upload Image
router.post('/upload-image', async (req, res) => {
    const sftp = new Client();
    try {
        const { files, body } = req;
        if (!files || !files.image || !body.gallery) {
            return res.status(400).send('Invalid request');
        }

        const imageFile = files.image;
        const fileName = imageFile.name;
        const galleryType = body.gallery;
        const baseRemotePath = '/home/user1/SchoolAPI/gallery/';
        const galleryPath = `${baseRemotePath}${galleryType}`;
        const remotePath = `${galleryPath}/${fileName}`;

        await sftp.connect({
            host: '103.69.196.162',
            port: 22,
            username: 'user1',
            password: 'Home@12#$'
        });

        await createDirectory(sftp, galleryPath);
        await sftp.put(imageFile.data, remotePath);
        await sftp.end();

        res.send('Image uploaded successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading image.');
    }
});

// View Images
router.get('/view-images/:gallery', async (req, res) => {
    const sftp = new Client();
    try {
        const { gallery } = req.params;
        const baseRemotePath = '/home/user1/SchoolAPI/gallery/';
        const galleryPath = `${baseRemotePath}${gallery}`;

        await sftp.connect({
            host: '103.69.196.162',
            port: 22,
            username: 'user1',
            password: 'Home@12#$'
        });

        const files = await listFiles(sftp, galleryPath);
        const imageArray = await Promise.all(
            files.map(async (file) => {
                const imageBuffer = await sftp.get(`${galleryPath}/${file}`);
                return {
                    filename: file,
                    data: imageBuffer.toString('base64')
                };
            })
        );

        await sftp.end();
        res.setHeader('Content-Type', 'application/json');
        res.json({ gallery, images: imageArray });
    } catch (err) {
        console.error(err);
        await sftp.end();
        res.status(500).send('Error serving images.');
    }
});

// List Subdirectories
router.get('/list-subdirectories', async (req, res) => {
    const sftp = new Client();
    try {
        const baseRemotePath = '/home/user1/SchoolAPI/gallery/';
        await sftp.connect({
            host: '103.69.196.162',
            port: 22,
            username: 'user1',
            password: 'Home@12#$'
        });

        const entries = await sftp.list(baseRemotePath);
        const subdirectories = entries.filter(e => e.type === 'd').map(d => d.name);

        await sftp.end();
        res.json({ subdirectories });
    } catch (err) {
        console.error(err);
        await sftp.end();
        res.status(500).send('Error listing sub-directories.');
    }
});

module.exports = router;
