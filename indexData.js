const express = require('express');
const fileUpload = require('express-fileupload');
const Client = require('ssh2-sftp-client');
const fs = require('fs').promises;

const app = express();
const port = 5000;

// Enable file uploads
app.use(fileUpload());

// SFTP configuration
const sftp = new Client();

// Function to create a directory if it doesn't exist
const createDirectory = async (remotePath) => {
  try {
    // Check if the directory exists
    const stat = await sftp.stat(remotePath);

    if (!stat.isDirectory()) {
      // If it's not a directory, create one
      await sftp.mkdir(remotePath, true);
    }
  } catch (err) {
    // If the directory doesn't exist, create one
    await sftp.mkdir(remotePath, true);
  }
};

// Express route for uploading PDF files
app.post('/upload', async (req, res) => {
  try {
    const { files, body } = req;

    if (!files || Object.keys(files).length === 0 || !body.class || !body.section) {
      return res.status(400).send('Invalid request. Make sure to provide class, section, and files.');
    }

    const pdfFile = files.pdf;
    const fileName = pdfFile.name;

    // Check if it's a PDF
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return res.status(400).send("Only PDF files are allowed.");
    }
    const { class: className, section } = body;

    // Connect to the Ubuntu server via SFTP
    await sftp.connect({
      host: '103.69.196.162',
      port: 22,
      username: 'user1',
      password: 'Home@12#$'
    });

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/notes/';

    // Create a directory for the class-section if it doesn't exist
    const classSectionPath = `${baseRemotePath}${className}-${section}`;
    await createDirectory(classSectionPath);

    // Specify the remote path where you want to save the file
    const remotePath = `${classSectionPath}/${fileName}`;

    // Upload the file to the server
    await sftp.put(pdfFile.data, remotePath);

    // Disconnect from the server
    await sftp.end();

    res.send('File uploaded successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading file.');
  }
});

app.post('/uploadEbooks', async (req, res) => {
  try {
    const { files, body } = req;

    if (!files || Object.keys(files).length === 0 || !body.class || !body.section) {
      return res.status(400).send('Invalid request. Make sure to provide class, section, and files.');
    }

    const pdfFile = files.pdf;
    const fileName = pdfFile.name;
    // Check if it's a PDF
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return res.status(400).send("Only PDF files are allowed.");
    }
    
    const { class: className, section } = body;

    // Connect to the Ubuntu server via SFTP
    await sftp.connect({
      host: '103.69.196.162',
      port: 22,
      username: 'user1',
      password: 'Home@12#$'
    });

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/E-Books/';

    // Create a directory for the class-section if it doesn't exist
    const classSectionPath = `${baseRemotePath}${className}-${section}`;
    await createDirectory(classSectionPath);

    // Specify the remote path where you want to save the file
    const remotePath = `${classSectionPath}/${fileName}`;

    // Upload the file to the server
    await sftp.put(pdfFile.data, remotePath);

    // Disconnect from the server
    await sftp.end();

    res.send('File uploaded successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error uploading file.');
  }
});


// Function to list files in a directory
const listFiles = async (remotePath) => {
  try {
    // Connect to the Ubuntu server via SFTP
    await sftp.connect({
      host: '103.69.196.162',
      port: 22,
      username: 'user1',
      password: 'Home@12#$'
    });

    // Get the list of files in the directory
    const files = await sftp.list(remotePath);

    // Disconnect from the server
    await sftp.end();

    return files.map(file => file.name);
  } catch (err) {
    console.error(err);
    return [];
  }
};

// Express route for listing notes based on class and section
app.get('/list-notes/:class/:section', async (req, res) => {
  try {
    const { class: className, section } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/notes/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Get the list of files in the directory
    const files = await listFiles(classSectionPath);

    res.json({ class: className, section, notes: files });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error listing notes.');
  }
});

app.get('/list-ebooks/:class/:section', async (req, res) => {
  try {
    const { class: className, section } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/E-Books/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Get the list of files in the directory
    const files = await listFiles(classSectionPath);

    res.json({ class: className, section, notes: files });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error listing notes.');
  }
});

// Function to retrieve the content of a file
const getFileContent = async (remotePath) => {
  try {
    // Connect to the Ubuntu server via SFTP
    await sftp.connect({
      host: '103.69.196.162',
      port: 22,
      username: 'user1',
      password: 'Home@12#$'
    });

    // Get the content of the file
    const fileContentBuffer = await sftp.get(remotePath);

    // Disconnect from the server
    await sftp.end();

    return fileContentBuffer;
  } catch (err) {
    console.error(err);
    return null;
  }
};

// Express route for downloading a specific note
app.get('/download-note/:class/:section/:filename', async (req, res) => {
  try {
    const { class: className, section, filename } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/notes/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Specify the remote path for the specific note
    const remotePath = `${classSectionPath}/${filename}`;

    // Get the content of the file
    const fileContent = await getFileContent(remotePath);

    if (fileContent) {
      // Set response headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      // res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      // Send the file content as the response
      res.send(fileContent);
    } else {
      res.status(404).send('File not found.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error downloading note.');
  }
});

app.get('/download-ebook/:class/:section/:filename', async (req, res) => {
  try {
    const { class: className, section, filename } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/E-Books/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Specify the remote path for the specific note
    const remotePath = `${classSectionPath}/${filename}`;

    // Get the content of the file
    const fileContent = await getFileContent(remotePath);

    if (fileContent) {
      // Set response headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      // res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      // Send the file content as the response
      res.send(fileContent);
    } else {
      res.status(404).send('File not found.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error downloading note.');
  }
});


// Function to delete a file
const deleteFile = async (remotePath) => {
  try {
    // Connect to the Ubuntu server via SFTP
    await sftp.connect({
      host: '103.69.196.162',
      port: 22,
      username: 'user1',
      password: 'Home@12#$'
    });

    // Delete the file
    await sftp.delete(remotePath);

    // Disconnect from the server
    await sftp.end();
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// Express route for deleting a specific note
app.delete('/delete-note/:class/:section/:filename', async (req, res) => {
  try {
    const { class: className, section, filename } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/notes/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Specify the remote path for the specific note
    const remotePath = `${classSectionPath}/${filename}`;

    // Delete the file
    await deleteFile(remotePath);

    res.send('File deleted successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting note.');
  }
});

app.delete('/delete-ebook/:class/:section/:filename', async (req, res) => {
  try {
    const { class: className, section, filename } = req.params;

    // Specify the base remote path where you want to store the files
    const baseRemotePath = '/home/user1/SchoolAPI/E-Books/';

    // Specify the remote path for the class-section folder
    const classSectionPath = `${baseRemotePath}${className}-${section}`;

    // Specify the remote path for the specific note
    const remotePath = `${classSectionPath}/${filename}`;

    // Delete the file
    await deleteFile(remotePath);

    res.send('File deleted successfully.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting note.');
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
