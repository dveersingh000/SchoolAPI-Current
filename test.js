const cors = require("cors");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path"); // Import the 'path' module
const { Chart } = require("chart.js");
const moment = require("moment-timezone");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const geoip = require('geoip-lite');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const fileUpload = require('express-fileupload');
const galleryRoutes = require('./indexGallery');

// Create an Express application
const app = express();
const port = 3000;
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(bodyParser.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  useTempFiles: false,
  abortOnLimit: true
}));

// Parse JSON request bodies
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', galleryRoutes);


// Define MongoDB connection string
// const mongoURI =
//   "mongodb://127.0.0.1:27017/SchoolDB";

const mongoURI =
  "mongodb+srv://ravi:HelloWorld%401234@rechargeapp.9uks18k.mongodb.net/SchoolDB";

// Connect to MongoDB
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

  // Define a MongoDB Schema for students
const studentSchema = new mongoose.Schema({
    name: String,
    age: Number,
    class: String,
    section: String,
    contactNumber: String,
    appRegNumber: String,
    motherName: String,
    fatherName: String,
    address: String,
    loginID: String,
    password: String,
    gender: String,
    DOB: String,
    aadharNumber: String,
    caste: String,
    permanantAddress: String,
    isResidential: {
      type: Boolean,
      default: false
    },
    profilePicture: {
      type: String,
      default: ""
    },
    presentDates: [String],
    absentDates: [String],
    notifications: [
      {
        date: String, // Date of the event in "DD-MM-YYYY" format
        time: String, // Time of the event
        reason: String, // Reason for the event
      },
    ],
    complaints: [
      {
        title: String,
        teacherName: String, // Name of the teacher who submitted the complaint
        date: String, // Date of the complaint in "DD-MM-YYYY" format
        complaintText: String, // Text of the complaint
      },
    ],
    feedback: [
      {
        teacherName: String, // Name of the teacher providing the feedback
        date: String, // Date of the feedback entry in "DD-MM-YYYY" format
        text: String, // Feedback text
        title: String,
      },
    ],
    examMarks: [
      {
        examID: String, // Identifier for the exam
        mark: Number, // Marks obtained by the student
      },
    ],
    totalFees: Number, // Total fees for the student
    feesDistributions: [
      {
        quarter: String, // E.g., 'Q1', 'Q2', 'Q3', 'Q4'
        totalQuarterlyFees: Number, // Total fees for the quarter
        feesPaid: Number, // Fees paid for the quarter
        modeOfPayment: String, // Payment mode for the quarter
      },
    ],
    leaveRequests: [
      {
        startDate: String, // Start date of the leave request
        endDate: String, // End date of the leave request
        reason: String, // Reason for leave
        ty: String,
        status: String,
        classTeacher: String,
      },
    ],
  });

  // Create a MongoDB model for students
const Student = mongoose.model("Student", studentSchema);

// Define a route to save a student
app.post("/students", async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      class: studentClass,
      section,
      contactNumber,
      appRegNumber,
      motherName,
      fatherName,
      address,
      DOB,
      aadharNumber,
      caste,
      permanantAddress,
      isResidential,

    } = req.body;

    let profilePicture = "";

    // If file is uploaded
    if (req.files && req.files.profilePicture) {
      const image = req.files.profilePicture;
      const fileName = Date.now() + "_" + image.name;
      const uploadPath = path.join(__dirname, "uploads", "students");

      // Create upload folder if not exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const fullPath = path.join(uploadPath, fileName);
      await image.mv(fullPath);

      // Save relative path (adjust if serving from static)
      profilePicture = `/uploads/students/${fileName}`;
    }

    const student = new Student({
      name,
      age,
      gender,
      class: studentClass,
      section,
      contactNumber,
      appRegNumber,
      motherName,
      fatherName,
      address,
      DOB,
      aadharNumber,
      caste,
      permanantAddress,
      isResidential,
      profilePicture,
    });

    await student.save();
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: "Could not save student" });
    console.log(error);
  }
});
  
 //===================Teachers Start=========================
const teacherSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  maritalStatus: String,
  address: String,
  gender: String,
  religion: String,
  post: String,
  subject: String,
  joiningDate: Date,
  salary: Number,
  inTime: String,
  outTime: String,
  profilePicture: {
    type: String,
    default: ""
  },
  present: [
    {
      date: String,
      record: {
        punchInTime: String,
        punchOutTime: String,
        totalWorkHours: String,
      },
    },
  ],
  absent: [Date],
  loginID: String,
  password: String,
  leaveRequests: [
    {
      startDate: String, // Start date of the leave request
      endDate: String, // End date of the leave request
      reason: String, // Reason for leave
      ty: String,
      classTeacher: String,
      status: String, // Status of the leave request (e.g., 'pending', 'approved', 'rejected')
    },
  ],
  lessonPlans: [
    {
      cls: String,
      section: String,
      date: String, // Date of the lesson
      subject: String, // Subject for the lesson
      content: String, // Lesson content or description
    },
  ],
});

// Route to add a teacher
app.post("/add-teacher", async (req, res) => {
    try {
      const {
        name,
        mobile,
        maritalStatus,
        address,
        gender,
        religion,
        post,
        subject,
        joiningDate,
        salary,
        inTime,
        outTime
      } = req.body;
  
      // 🟡 Parse joiningDate (if needed, assuming DD/MM/YYYY)
      let parsedJoiningDate = new Date(joiningDate);
      if (joiningDate.includes("/")) {
        const [day, month, year] = joiningDate.split("/");
        parsedJoiningDate = new Date(`${year}-${month}-${day}`);
      }
  
      let profilePicture = "";
  
      if (req.files && req.files.profilePicture) {
        const image = req.files.profilePicture;
        const fileName = Date.now() + "_" + image.name;
        const uploadPath = path.join(__dirname, "uploads", "teachers");
  
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
  
        const fullPath = path.join(uploadPath, fileName);
        await image.mv(fullPath);
  
        profilePicture = `/uploads/teachers/${fileName}`;
      }
  
      const loginID = generateRandomLoginID(); // implement this
      const password = generateRandomPassword(); // implement this
  
      const teacher = new Teacher({
        name,
        mobile,
        maritalStatus,
        address,
        gender,
        religion,
        post,
        subject,
        joiningDate: parsedJoiningDate,
        salary,
        inTime,
        outTime,
        loginID,
        password,
        profilePicture,
      });
  
      await teacher.save();
  
      res.status(200).json({ message: "Teacher added successfully", teacher });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not add teacher" });
    }
  });
  
  
  // Helper function to generate a random 6-digit alphanumeric string
  function generateRandomLoginID() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let loginID = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      loginID += characters.charAt(randomIndex);
    }
    return loginID;
  }
  
  // Helper function to generate a random 6-digit numeric password
  function generateRandomPassword() {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    return password;
  }

  // Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });