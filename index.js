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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use(fileUpload({
//   limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
//   useTempFiles: false,
//   abortOnLimit: true
// }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(bodyParser.json());


// Parse JSON request bodies
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


// BLOCX NODE API FOR COORDINATES
app.get('/getCoordinates', async (req, res) => {
  try {
    // Fetch data from the provided API
    const response = await axios.get('https://api-explorer.blocx.space/ext/getmasternodelist');
    const data = response.data;

    // Extract and transform the data to get coordinates from IP addresses
    const coordinatesPromises = data.map(async (node) => {
      const [ip] = node.ip_address.split(':');
      const geo = geoip.lookup(ip);

      if (geo && geo.ll) {
        return {
          rank: node.rank,
          address: node.addr,
          latitude: geo.ll[0],
          longitude: geo.ll[1],
        };
      } else {
        return null;
      }
    });

    const coordinates = await Promise.all(coordinatesPromises);
    res.json(coordinates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the data.' });
  }
});

// Mapping of country codes to coordinates
const countryCoordinates = {
  CN: { latitude: 39.9042, longitude: 116.4074 }, // Example for China
  US: { latitude: 37.7749, longitude: -122.4194 }, // Example for the United States
  DE: { latitude: 51.1657, longitude: 10.4515 }, // Example for Germany
  SG: { latitude: 1.3521, longitude: 103.8198 }, // Example for Singapore
  NL: { latitude: 52.3676, longitude: 4.9041 }, // Example for Netherlands
  IL: { latitude: 31.0461, longitude: 34.8516 }, // Example for Israel
  ES: { latitude: 40.4168, longitude: -3.7038 }, // Example for Spain
  PL: { latitude: 51.9194, longitude: 19.1451 }, // Example for Poland
  GB: { latitude: 51.5099, longitude: -0.1180 }, // Example for the United Kingdom
  RO: { latitude: 45.9432, longitude: 24.9668 }, // Example for Romania
  RU: { latitude: 61.5240, longitude: 105.3188 }, // Example for Russia
  TN: { latitude: 33.8869, longitude: 9.5375 }, // Example for Tunisia
  NZ: { latitude: -40.9006, longitude: 174.8860 }, // Example for New Zealand
  JP: { latitude: 36.2048, longitude: 138.2529 }, // Example for Japan
  AU: { latitude: -25.2744, longitude: 133.7751 }, // Example for Australia
  FR: { latitude: 46.6031, longitude: 1.8883 }, // Example for France
  // Add more country codes and their corresponding coordinates as needed
};

// Mapping to store used coordinates for each country
const usedCoordinates = {};

app.get('/getpeerLocation', async (req, res) => {
  try {
    // Make a request to the provided API
    const response = await axios.get('https://api-explorer.blocx.space/ext/getnetworkpeers');

    // Extract and generate coordinates based on country_code
    const locations = response.data.map((peer) => {
      const { country_code } = peer;
      if (country_code && countryCoordinates[country_code]) {
        const countryUsedCoordinates = usedCoordinates[country_code] || [];
        let coordinates;

        // Generate unique coordinates for the country
        do {
          coordinates = generateRandomCoordinates(countryCoordinates[country_code]);
        } while (countryUsedCoordinates.some((usedCoord) => areCoordinatesEqual(usedCoord, coordinates)));

        // Store used coordinates for the country
        usedCoordinates[country_code] = [...countryUsedCoordinates, coordinates];

        return {
          address: peer.address,
          country_code: peer.country_code,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      }
    });

    res.json(locations.filter(Boolean)); // Filter out undefined results
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function generateRandomCoordinates(baseCoordinates) {
  // Generate random coordinates around the base coordinates
  const latitude = baseCoordinates.latitude + (Math.random() - 0.5) * 10;
  const longitude = baseCoordinates.longitude + (Math.random() - 0.5) * 10;
  return { latitude, longitude };
}

function areCoordinatesEqual(coord1, coord2) {
  // Check if two sets of coordinates are equal
  return coord1.latitude === coord2.latitude && coord1.longitude === coord2.longitude;
}
// END HERE - NO SCHOOL API



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

// Pre-save hook to generate loginID and password
studentSchema.pre("save", function (next) {
  const student = this;

  // Check if loginID is already set (meaning it's an existing student)
  if (!student.loginID) {
    const randomWord = Math.random().toString(36).substring(2, 5).toUpperCase();
    const randomNumbers = Math.random().toString().substring(2, 6);

    // Construct loginID and password based on the provided criteria
    student.loginID = randomWord + randomNumbers;
    student.password =
      student.name.substring(0, 3) + student.appRegNumber.substring(0, 4);
  }

  next();
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

// Define a route to get students by class
app.get("/get-students", async (req, res) => {
  try {
    const className = req.query.class;

    // If className is not provided, retrieve all students
    const query = className ? { class: className } : {};

    const students = await Student.find(query);
    res.status(200).json(students);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Define a route to get students by class
app.get("/get-orignal-students", async (req, res) => {
  try {
    const className = req.query.class;

    // If className is not provided, retrieve all students
    const query = className ? { class: className } : {};

    const students = await Student.find(query);
    res.status(200).json(StudentData);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Define a route to get a student by loginID
app.get("/get-student/loginID/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Find the student by loginID
    const student = await Student.findOne({ loginID: loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch student" });
  }
});

app.get("/get-classes", async (req, res) => {
  try {
    const classes = await Student.distinct("class");

    // Filter out empty or null classes
    const validClasses = classes.filter(c => c && c.trim() !== "");

    // Define custom order (adjust as per your actual class levels)
    const customOrder = [
      "PNUR", "NUR", "HKG", "UKG",
      "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "10th"
    ];

    // Sort based on custom order; unknowns go to the end
    validClasses.sort((a, b) => {
      const indexA = customOrder.indexOf(a);
      const indexB = customOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    res.status(200).json(validClasses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch classes" });
  }
});


// Route to count students by gender
app.get('/students/count-by-gender', async (req, res) => {
  try {
    const maleCount = await Student.countDocuments({ gender: 'Male' });
    const femaleCount = await Student.countDocuments({ gender: 'Female' });

    res.json({
      maleCount,
      femaleCount,
      total: maleCount + femaleCount,
    });
  } catch (error) {
    console.error('Error counting students by gender:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a student by loginID
app.delete("/students/loginID/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Delete the student record from the database using loginID
    const deletedStudent = await Student.findOneAndRemove({ loginID: loginID });

    if (!deletedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Could not delete student" });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const { loginID, password } = req.body;

    // Find the student with the provided loginID
    const student = await Student.findOne({ loginID: loginID });

    if (!student) {
      return res
        .status(401)
        .json({ error: "Login failed. Invalid loginID or password." });
    }

    // Check if the provided password matches the student's password
    if (password !== student.password) {
      return res
        .status(401)
        .json({ error: "Login failed. Invalid loginID or password." });
    }

    // Authentication successful
    res
      .status(200)
      .json({ message: "Login successful", loginID: student.loginID });
  } catch (error) {
    res.status(500).json({ error: "Login failed. Internal server error." });
  }
});

app.get("/get-classes-with-loginids", async (req, res) => {
  try {
    // Get all distinct classes (including nulls/empties)
    const rawClasses = await Student.distinct("class");

    // Filter out null or empty class names
    const validClasses = rawClasses.filter(c => c && c.trim() !== "");

    // Define custom logical order for sorting
    const customOrder = [
      "PNUR", "NUR", "HKG", "UKG",
      "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "10th"
    ];

    const classInfoWithLoginIDs = [];

    for (const className of validClasses) {
      const studentsInClass = await Student.find(
        { class: className },
        "loginID"
      );

      const loginIDs = studentsInClass.map((student) => student.loginID);
      classInfoWithLoginIDs.push({ class: className, loginIDs });
    }

    // Sort the final result using custom class order
    classInfoWithLoginIDs.sort((a, b) => {
      const indexA = customOrder.indexOf(a.class);
      const indexB = customOrder.indexOf(b.class);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    res.status(200).json(classInfoWithLoginIDs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch classes and loginIDs" });
  }
});


// Define a MongoDB Schema for visitors with separate date and time fields
const visitorSchema = new mongoose.Schema({
  name: String,
  purpose: String,
  toWho: String,
  mobile: String,
  visitorID: String,
  visitDate: String,
  visitTime: String,
  leaveTime: String,
});

const Visitor = mongoose.model("Visitor", visitorSchema);

// Create a new visitor entry
app.post("/visitors", async (req, res) => {
  try {
    const { name, purpose, toWho, mobile } = req.body;

    // Generate a random 6-digit numeric ID for the visitor
    const visitorID = Math.floor(100000 + Math.random() * 900000).toString();

    // Get the current date and time in your desired time zone
    const currentDate = moment.tz("Asia/Kolkata"); // Replace 'YourTimeZone' with the desired time zone, e.g., 'Asia/Kolkata'
    const visitDate = currentDate.format("YYYY-MM-DD"); // Get date in "YYYY-MM-DD" format
    const visitTime = currentDate.format("hh:mm A"); // Get time in "hh:mm AM/PM" format

    const visitor = new Visitor({
      name,
      purpose,
      toWho,
      mobile,
      visitorID,
      visitDate,
      visitTime,
    });

    await visitor.save();
    res.status(200).json({ result: "Entry Successful" });
  } catch (error) {
    res.status(500).json({ error: "Could not save visitor" });
    console.log(error);
  }
});

// Define a route to get all visitors
app.get("/get-visitors", async (req, res) => {
  try {
    const visitors = await Visitor.find();
    res.status(200).json(visitors);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch visitors" });
  }
});

//GRAPH

// Define a route to plot a bar graph of total visitors per day
app.get("/total-visitors-per-day", async (req, res) => {
  try {
    // Retrieve all visitor records
    const visitors = await Visitor.find();

    // Create an object to store the total visitors per day
    const visitorsPerDay = {};

    // Calculate the total visitors for each day
    visitors.forEach((visitor) => {
      const { visitDate } = visitor;
      if (visitorsPerDay[visitDate]) {
        visitorsPerDay[visitDate]++;
      } else {
        visitorsPerDay[visitDate] = 1;
      }
    });

    // Extract the dates and visitor counts for chart data
    const dates = Object.keys(visitorsPerDay);
    const visitorCounts = Object.values(visitorsPerDay);

    // Generate a simple HTML page with the chart
    const chartHtml = `
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <canvas id="visitorChart" width="400" height="200"></canvas>
    <script>
      const ctx = document.getElementById('visitorChart').getContext('2d');
      
      // Function to generate a random RGB color
      const getRandomColor = () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return \`rgba(\${r}, \${g}, \${b}, 0.2)\`;
      };
      
      const dates = ${JSON.stringify(dates)};
      const visitorCounts = ${JSON.stringify(visitorCounts)};
      
      // Create an array to store random colors for each bar
      const backgroundColors = dates.map(() => getRandomColor());
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dates,
          datasets: [{
            label: 'Total Visitors',
            data: visitorCounts,
            backgroundColor: backgroundColors, // Assign random colors
            borderColor: backgroundColors,
            borderWidth: 2,
          }],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    </script>
  </body>
</html>
`;

    // Send the HTML page as a response
    res.send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate chart" });
  }
});

app.get("/visitor-left/:visitorID", async (req, res) => {
  try {
    const { visitorID } = req.params;

    // Find the visitor by visitorID
    const visitor = await Visitor.findOne({ visitorID });

    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    // Get the current date and time for the visitor leaving in the desired time zone
    const tz = "Asia/Kolkata"; // Replace 'YourTimeZone' with the desired time zone, e.g., 'Asia/Kolkata'
    const currentDate = moment.tz(tz);
    const leaveTime = currentDate.format("hh:mm A");

    // Update the visitor's leave time in the visitor document
    visitor.leaveTime = leaveTime;

    // Save the updated visitor document in the visitors collection
    await visitor.save();

    res.status(200).json({ message: "Visitor left successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to record visitor leave time" });
  }
});

//Total-Visitor-Count of PRESENT DATE
app.get("/total-visitors-in-today", async (req, res) => {
  try {
    // Get the current date in the desired time zone
    const tz = "Asia/Kolkata"; // Replace with your desired time zone
    const currentDate = moment.tz(tz);

    // Format the current date in "YYYY-MM-DD" format
    const todayDate = currentDate.format("YYYY-MM-DD");

    // Use MongoDB aggregation to count visitors for today
    const totalVisitors = await Visitor.countDocuments({
      visitDate: todayDate,
    });

    res.status(200).json({ totalVisitors });
  } catch (error) {
    res.status(500).json({ error: "Failed to count total visitors for today" });
  }
});

// Total-Visitor-Count OUT on PRESENT DATE
app.get("/total-visitors-out-today", async (req, res) => {
  try {
    // Get the current date in the desired time zone
    const tz = "Asia/Kolkata"; // Replace with your desired time zone
    const currentDate = moment.tz(tz);

    // Format the current date in "YYYY-MM-DD" format
    const todayDate = currentDate.format("YYYY-MM-DD");

    // Use MongoDB aggregation to count visitors with leaveTime on today's date
    const totalVisitors = await Visitor.countDocuments({
      visitDate: todayDate,
      // Check if leaveTime exists and if it starts with today's date
      leaveTime: { $exists: true },
    });
    console.log(totalVisitors);

    res.status(200).json({ totalVisitors });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to count total visitors OUT for today" });
  }
});

// Total-Visitor-Count by Purpose for PRESENT DAY
app.get("/pieVchart", async (req, res) => {
  try {
    // Get the current date in the desired time zone
    const tz = "Asia/Kolkata"; // Replace with your desired time zone
    const currentDate = moment.tz(tz);

    // Format the current date in "YYYY-MM-DD" format
    const todayDate = currentDate.format("YYYY-MM-DD");

    // Use MongoDB aggregation to group visitors by purpose and count them for today
    const purposeCounts = await Visitor.aggregate([
      {
        $match: {
          visitDate: todayDate,
        },
      },
      {
        $group: {
          _id: "$purpose",
          count: { $sum: 1 },
        },
      },
    ]);

    // Extract the purpose labels and counts
    const purposeLabels = purposeCounts.map((item) => item._id);
    const purposeData = purposeCounts.map((item) => item.count);

    // Generate a simple HTML page with the pie chart
    const chartHtml = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <canvas id="purposeChart" width="400" height="200"></canvas>
          <script>
            const ctx = document.getElementById('purposeChart').getContext('2d');

            // Function to generate a random RGB color
            const getRandomColor = () => {
              const r = Math.floor(Math.random() * 256);
              const g = Math.floor(Math.random() * 256);
              const b = Math.floor(Math.random() * 256);
              return \`rgba(\${r}, \${g}, \${b}, 0.5)\`;
            };

            const purposeLabels = ${JSON.stringify(purposeLabels)};
            const purposeData = ${JSON.stringify(purposeData)};

            // Create an array to store random colors for each pie slice
            const backgroundColors = purposeLabels.map(() => getRandomColor());

            new Chart(ctx, {
              type: 'pie',
              data: {
                labels: purposeLabels,
                datasets: [
                  {
                    data: purposeData,
                    backgroundColor: backgroundColors, // Assign random colors
                  },
                ],
              },
            });
          </script>
        </body>
      </html>
    `;

    // Send the HTML page as a response
    res.send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate pie chart" });
  }
});

// BUS LOCATION UPDATE
const busSchema = new mongoose.Schema({
  name: String,
  latitude: Number,
  longitude: Number,
  driver: {
    name: String,
    contactNumber: String,
    busRoute: String,
    pin: String, // 6-digit pin
  },
});

const Bus = mongoose.model("Bus", busSchema);

// Route to add driver details to a bus
app.post("/add-driver/:busName", async (req, res) => {
  try {
    const { busId } = req.params;
    const { name, contactNumber, busRoute, pin } = req.body;

    // Find the bus by ID
    // const bus = await Bus.findById(busId);
    const bus = await Bus.findOne({ busId });

    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    // Update driver details
    bus.driver = {
      name,
      contactNumber,
      busRoute,
      pin,
    };

    // Save the updated bus document
    await bus.save();

    res.status(200).json({ message: "Driver details added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add driver details" });
  }
});

// Route for driver login
app.post("/driver-login", async (req, res) => {
  try {
    const { contactNumber, pin } = req.body;

    // Find the bus with matching driver contact number and pin
    const bus = await Bus.findOne({
      "driver.contactNumber": contactNumber,
      "driver.pin": pin,
    });

    if (!bus) {
      return res
        .status(401)
        .json({ error: "Login failed. Invalid credentials" });
    }

    // If the driver is found, return the bus name in the response
    res.status(200).json({ busName: bus.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed. Internal server error" });
  }
});

// API endpoint to receive and update bus location
app.post("/update-location", async (req, res) => {
  const { name, latitude, longitude } = req.body;

  try {
    // Find the bus by name
    const existingBus = await Bus.findOne({ name });

    if (existingBus) {
      // Update the existing bus's location
      existingBus.latitude = latitude;
      existingBus.longitude = longitude;
      await existingBus.save();
    } else {
      // Create a new bus entry if it doesn't exist
      const newBus = new Bus({ name, latitude, longitude });
      await newBus.save();
    }

    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create an HTTP server
const server = http.createServer(app);

// Create a WebSocket server attached to the HTTP server
const io = socketIo(server);

// Real-time location updates using WebSocket
io.on("connection", (socket) => {
  console.log("A client connected");

  // Emit location updates to connected clients every second
  setInterval(async () => {
    try {
      // Fetch all bus locations from the database
      const busLocations = await Bus.find({}, "name latitude longitude");

      // Send the bus locations to connected clients
      socket.emit("location-update", busLocations);
    } catch (error) {
      console.error(error);
    }
  }, 1000);

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Define a route to get the latitude and longitude of a bus by its name
app.get("/bus-location/:name", async (req, res) => {
  const { name } = req.params;

  try {
    // Find the bus by name and select only the latitude and longitude fields
    const bus = await Bus.findOne({ name }, "latitude longitude");

    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }

    res.json(bus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a route to list the names of all buses
app.get("/list-buses", async (req, res) => {
  try {
    // Find all buses and return their names
    const buses = await Bus.find({}, "name");

    if (!buses) {
      return res.status(404).json({ error: "No buses found" });
    }

    // Extract the names from the buses and create an array
    const busNames = buses.map((bus) => bus.name);

    res.json(busNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define the PUT endpoint to edit the driver details
app.put('/buses/:id/driver', async (req, res) => {
  const { id } = req.params; // Extract the bus ID from the URL params
  const { name, contactNumber, busRoute, pin } = req.body; // Extract driver details from the request body

  try {
    // Validate the bus ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bus ID' });
    }

    // Find the bus by ID
    const bus = await Bus.findById(id);

    // Check if the bus exists
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Update the driver details
    bus.driver.name = name;
    bus.driver.contactNumber = contactNumber;
    bus.driver.busRoute = busRoute;
    bus.driver.pin = pin;

    // Save the updated bus details
    await bus.save();

    // Return success response
    res.status(200).json({ message: 'Driver details updated successfully', bus });
  } catch (error) {
    // Handle errors
    console.error('Error updating driver details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/buses/:id', async (req, res) => {
  const { id } = req.params; // Extract the bus ID from the URL params

  try {
    // Validate the bus ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid bus ID' });
    }

    // Find the bus by ID and delete it
    const bus = await Bus.findByIdAndDelete(id);

    // Check if the bus exists
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    // Return success response
    res.status(200).json({ message: 'Bus deleted successfully' });
  } catch (error) {
    // Handle errors
    console.error('Error deleting bus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//CREATE A NEW BUS WITH DRIVER 
app.post('/add-buses', async (req, res) => {
  try {
    // Create a new bus using the request body
    const newBus = new Bus({
      name: req.body.name,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      driver: {
        name: req.body.driver.name,
        contactNumber: req.body.driver.contactNumber,
        busRoute: req.body.driver.busRoute,
        pin: req.body.driver.pin
      }
    });

    // Save the new bus to the database
    const savedBus = await newBus.save();

    // Return the saved bus as a response
    res.status(201).json(savedBus);
  } catch (error) {
    // Handle errors
    console.error('Error adding new bus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/update-attendance", async (req, res) => {
  try {
    const { loginID, date, isPresent } = req.body;

    if (!loginID || !date || isPresent === undefined) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (isPresent) {
      student.presentDates.push(new Date(date));
    } else {
      student.absentDates.push(new Date(date));
    }

    await student.save();

    res.status(200).json({ message: "Attendance updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

const expenseWEBSchema = new mongoose.Schema({
  name: String,
  expenseType: String,
  status: String,
  amount: Number,
  phone: String,
  email: String,
  date: String
});

const ExpenseWEB = mongoose.model('ExpenseWEB', expenseWEBSchema);
app.post('/expensesWEB', async (req, res) => {
  try {
    const expense = new ExpenseWEB(req.body);
    await expense.save();
    res.status(201).send(expense);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all expenses
app.get('/expensesWEB', async (req, res) => {
  try {
    const expenses = await ExpenseWEB.find();
    res.send(expenses);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/expensesWEB/:id', async (req, res) => {
  try {
    const expense = await ExpenseWEB.findById(req.params.id);
    if (!expense) {
      return res.status(404).send({ error: 'Expense not found' });
    }
    res.send(expense);
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


// Update expense by ID
app.put('/expensesWEB/:id', async (req, res) => {
  try {
    const expense = await ExpenseWEB.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) {
      return res.status(404).send();
    }
    res.send(expense);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete expense by ID
app.delete('/expensesWEB/:id', async (req, res) => {
  try {
    const expense = await ExpenseWEB.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).send();
    }
    res.send(expense);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Define a route to edit a student by loginID

app.put("/edit-student/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;
    const {
      name, age, gender, class: studentClass, section,
      contactNumber, appRegNumber, motherName, fatherName,
      address, DOB, aadharNumber, caste, permanantAddress,
      isResidential, receivesBreakfast, receivesLunch
    } = req.body;

    const updateFields = {
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
      receivesBreakfast,
      receivesLunch
    };

    // ✅ Handle new profile picture upload
    if (req.files && req.files.profilePicture) {
      const image = req.files.profilePicture;
      const fileName = Date.now() + "_" + image.name;
      const uploadPath = path.join(__dirname, "uploads", "students");

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const fullPath = path.join(uploadPath, fileName);
      await image.mv(fullPath);

      updateFields.profilePicture = `/uploads/students/${fileName}`;
    }

    // ✅ Update student
    const updatedStudent = await Student.findOneAndUpdate(
      { loginID },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json(updatedStudent);
  } catch (error) {
    console.error("Edit error:", error);
    res.status(500).json({ error: "Failed to update student" });
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

// Define a method to calculate and set the total work hours
teacherSchema.methods.calculateTotalWorkHours = function () {
  this.present.forEach((presence) => {
    const punchIn = new Date(`2023-09-30 ${presence.punchInTime}`);
    const punchOut = new Date(`2023-09-30 ${presence.punchOutTime}`);
    const timeDiffMs = punchOut - punchIn;
    const hours = Math.floor(timeDiffMs / 1000 / 60 / 60);
    const minutes = Math.floor((timeDiffMs / 1000 / 60) % 60);
    presence.totalWorkHours = `${hours} hours ${minutes} minutes`;
  });
};

const Teacher = mongoose.model("Teacher", teacherSchema);

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
    console.log("FILES:", req.files); // ← Add this
console.log("BODY:", req.body);


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

// Import necessary modules and set up your Express app

// Add a route to get a teacher's details by login ID
app.get("/teachers/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID; // Get the login ID from the request parameters

    // Retrieve the teacher record with the specified login ID from the database
    const teacher = await Teacher.findOne({ loginID: loginID });

    // Check if a teacher with the provided login ID exists
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Send the teacher's details as a JSON response
    res.status(200).json(teacher);
  } catch (error) {
    // Handle any errors that occur during the database query
    res.status(500).json({ error: "Could not fetch teacher details" });
  }
});

// Delete a teacher by loginID
app.delete("/teacher/loginID/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Delete the student record from the database using loginID
    const deletedTeacher = await Teacher.findOneAndRemove({ loginID: loginID });

    if (!deletedTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Could not delete student" });
  }
});

// Define a route to edit a teacher by loginID
app.put("/edit-teacher/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID; // Get the loginID from the URL parameters
    // const updatedTeacherData = req.body; // Get the updated student data from the request body
    const { name, mobile, maritalStatus, address, gender, religion, post, subject, joiningDate, salary, inTime, outTime } = req.body;
    const updatedTeacherData = {
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
      outTime,
    };

    // ✅ Handle new profile picture upload
    if (req.files && req.files.profilePicture) {
      const image = req.files.profilePicture;
      const fileName = Date.now() + "_" + image.name;
      const uploadPath = path.join(__dirname, "uploads", "teachers");

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const fullPath = path.join(uploadPath, fileName);
      await image.mv(fullPath);

      updatedTeacherData.profilePicture = `/uploads/teachers/${fileName}`;
    }

    const updatedTeacher = await Teacher.findOneAndUpdate(
      { loginID },
      updatedTeacherData,
      {
        new: true, // Return the updated student data
        runValidators: true, // Validate the updated data against the schema
      }
    );

      if (!updatedTeacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }
    

    // Find the student by their loginID and update their information
    // const updatedTeacher = await Teacher.findOneAndUpdate(
    //   { loginID },
    //   updatedTeacherData,
    //   {
    //     new: true, // Return the updated student data
    //     runValidators: true, // Validate the updated data against the schema
    //   }
    // );

    // if (!updatedTeacher) {
    //   // If the student with the given loginID is not found, return a 404 response
    //   return res.status(404).json({ error: "Teacher not found" });
    // }

    // Return the updated student data as a response
    res.status(200).json(updatedTeacher);
  } catch (error) {
    // Handle errors and send an appropriate response
    console.error(error);
    res.status(500).json({ error: "Failed to update teacher" });
  }
});

app.get("/punch-in/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Get the current date in "YYYY-MM-DD" format
    const currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment().tz("Asia/Kolkata").format("hh:mm:ss A");

    // Find the teacher by loginID
    const existingTeacher = await Teacher.findOne({ loginID });

    if (!existingTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Check if the teacher is marked as absent for the current date
    const isAbsent = existingTeacher.absent.includes(currentDate);

    if (isAbsent) {
      return res
        .status(400)
        .json({ error: "Punch in not allowed for absent teachers" });
    }

    // Check if there is already a punch-in entry for the current date
    const existingPunchIn = existingTeacher.present.find((presence) => {
      return (
        presence.date === currentDate && presence.record.punchOutTime === ""
      );
    });

    if (existingPunchIn) {
      return res
        .status(400)
        .json({ error: "Punch-in already recorded for today" });
    }

    // Check if there is a punch-in entry for today with a punch-out time
    const todayPunchIn = existingTeacher.present.find((presence) => {
      return (
        presence.date === currentDate && presence.record.punchOutTime !== ""
      );
    });

    if (todayPunchIn) {
      return res.status(400).json({
        error:
          "Punch-in cannot be recorded for today as punch-out is already recorded",
      });
    }

    // Create a new presence entry
    const newPresence = {
      date: currentDate,
      record: {
        punchInTime: currentTime,
        punchOutTime: "",
        totalWorkHours: "",
      },
    };

    // Add the new presence entry to the teacher's presence array
    existingTeacher.present.push(newPresence);

    // Save the updated teacher record
    await existingTeacher.save();

    res.status(200).json({
      message: "Punch-in recorded successfully",
      punchInDate: currentDate,
      punchInTime: currentTime,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/punch-out/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Get the current date in "YYYY-MM-DD" format
    const currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment().tz("Asia/Kolkata").format("hh:mm:ss A");

    // Find the teacher by loginID
    const existingTeacher = await Teacher.findOne({ loginID });

    if (!existingTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Check if the teacher is marked as absent for the current date
    const isAbsent = existingTeacher.absent.includes(currentDate);

    if (isAbsent) {
      return res
        .status(400)
        .json({ error: "Punch out not allowed for absent teachers" });
    }

    // Check if there is already a punch-out entry for the current date
    const existingPunchOut = existingTeacher.present.find((presence) => {
      return (
        presence.date === currentDate && presence.record.punchOutTime !== ""
      );
    });

    if (existingPunchOut) {
      return res
        .status(400)
        .json({ error: "Punch-out already recorded for today" });
    }

    // Find the last punch-in entry for today
    const todayPunchIn = existingTeacher.present.find((presence) => {
      return (
        presence.date === currentDate && presence.record.punchOutTime === ""
      );
    });

    if (!todayPunchIn) {
      return res.status(400).json({
        error:
          "Punch-out cannot be recorded without a punch-in entry for today",
      });
    }

    // Update the punch-out time for the last punch-in entry
    todayPunchIn.record.punchOutTime = currentTime;

    // Calculate and set the total work hours
    const punchIn = moment(`2023-09-30 ${todayPunchIn.record.punchInTime}`);
    const punchOut = moment(`2023-09-30 ${todayPunchIn.record.punchOutTime}`);
    const duration = moment.duration(punchOut.diff(punchIn));
    todayPunchIn.record.totalWorkHours = `${Math.floor(
      duration.asHours()
    )} hours ${duration.minutes()} minutes`;

    // Save the updated teacher record
    await existingTeacher.save();

    res.status(200).json({
      message: "Punch-out recorded successfully",
      punchOutDate: currentDate,
      punchOutTime: currentTime,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// For marking a teacher as absent
app.get("/absent/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Get the current date in "YYYY-MM-DD" format
    const currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    // Find the teacher by loginID
    const existingTeacher = await Teacher.findOne({ loginID });

    if (!existingTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Check if the teacher is already marked as absent for the current date
    if (existingTeacher.absent.includes(currentDate)) {
      return res
        .status(400)
        .json({ error: "Teacher is already marked as absent for today" });
    }

    // Mark the teacher as absent for the current date
    existingTeacher.absent.push(currentDate);

    // Save the changes to the database
    await existingTeacher.save();

    res.status(200).json({
      message: "Teacher marked as absent for today",
      absentDate: currentDate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//--------Bar-Chart For the WORK HOURS--------
app.get("/teacher-chart/:loginID", async (req, res) => {
  try {
    // Retrieve the loginID from the route parameters
    const { loginID } = req.params;

    // Fetch the teacher's data from MongoDB based on the provided loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Extract the relevant data for the chart
    const dates = teacher.present.map((presence) => presence.date);
    const totalWorkHours = teacher.present.map((presence) => {
      // Extract hours and minutes from the totalWorkHours string
      const match = presence.record.totalWorkHours.match(
        /(\d+) hours (\d+) minutes/
      );
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        // Convert to total hours and minutes
        return hours + minutes / 60;
      } else {
        return 0; // Handle invalid totalWorkHours format
      }
    });

    // Create a constant background color for the bars
    const backgroundColor = "rgba(75, 192, 192, 0.2)";

    // Generate the chart as HTML
    const chartHtml = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <canvas id="teacherChart" width="400" height="200"></canvas>
          <script>
            const ctx = document.getElementById('teacherChart').getContext('2d');
            const chartConfig = {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(dates)},
                datasets: [{
                  label: 'Total Work Hours',
                  data: ${JSON.stringify(totalWorkHours)},
                  backgroundColor: '${backgroundColor}', // Use a constant background color
                  borderColor: '${backgroundColor}',
                  borderWidth: 1,
                }],
              },
              options: {
                scales: {
                  y: {
                    beginAtZero: false, // Adjust this to false
                    ticks: {
                      callback: function (value, index, values) {
                        // Format the y-axis labels as hours and minutes
                        const hours = Math.floor(value);
                        const minutes = Math.round((value - hours) * 60);
                        return hours + ' hr ' + minutes + ' min';
                      },
                    },
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        // Format the tooltip label as hours and minutes
                        const value = context.parsed.y;
                        const hours = Math.floor(value);
                        const minutes = Math.round((value - hours) * 60);
                        return hours + ' hr ' + minutes + ' min';
                      },
                    },
                  },
                },
              },
            };
            new Chart(ctx, chartConfig);
          </script>
        </body>
      </html>
    `;

    // Set the content type to HTML and send the chart as an HTML response
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate chart" });
  }
});

//-------Pie-Chart for the Attendence---------
app.get("/teacher-status-chart/:loginID", async (req, res) => {
  try {
    // Retrieve the loginID from the route parameters
    const { loginID } = req.params;

    // Fetch the teacher's data from MongoDB based on the provided loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Count the number of present and absent entries for the teacher
    const presentCount = teacher.present.length;
    const absentCount = teacher.absent.length;

    // Generate the chart as HTML
    const chartHtml = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <canvas id="statusChart" width="400" height="200"></canvas>
          <script>
            const ctx = document.getElementById('statusChart').getContext('2d');
            const chartConfig = {
              type: 'pie',
              data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                  data: [${presentCount}, ${absentCount}],
                  backgroundColor: ['green', 'red'],
                }],
              },
            };
            new Chart(ctx, chartConfig);
          </script>
        </body>
      </html>
    `;

    // Set the content type to HTML and send the chart as an HTML response
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate chart" });
  }
});

app.post("/teacher-login", async (req, res) => {
  try {
    const { loginID, password } = req.body;

    // Search for a teacher with the provided loginID and password
    const teacher = await Teacher.findOne({ loginID, password });

    if (teacher) {
      // Teacher found, generate an authentication token if needed
      // You can use authentication libraries like JWT to create a token

      // Respond with a success message or token
      // , Name : teacher.name, LoginID : teacher.loginID  
      res.status(200).json({ message: "Teacher logged in successfully" });
    } else {
      // Teacher not found or invalid credentials
      res.status(401).json({ error: "Invalid login credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

//--------Get Student of a class---------
app.get("/get-students/:class", async (req, res) => {
  try {
    const classInfo = req.params.class; // Assuming the parameter is formatted as "class-section"

    // Find students in the specified class and section
    const students = await Student.find({ class: classInfo });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this class" });
    }

    // Extract loginID, name, and classInfo of each student
    const studentData = students.map((student) => ({
      loginID: student.loginID,
      name: student.name,
      classInfo: student.class + "-" + student.section,
    }));

    res.status(200).json(studentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

//--------Present and Absent-----------
// Route to mark a student as present with the current date in "DD-MM-YYYY" format
app.get("/mark-present/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Get the current date in "DD-MM-YYYY" format
    const currentDate = new Date()
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .reverse()
      .join("-");

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Add the current date to the presentDates array
    student.presentDates.push(currentDate);

    // Remove the current date from the absentDates array (if it exists)
    const dateIndex = student.absentDates.indexOf(currentDate);
    if (dateIndex !== -1) {
      student.absentDates.splice(dateIndex, 1);
    }

    // Save the updated student data
    await student.save();

    res.status(200).json({ message: "Student marked as present", student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark student as present" });
  }
});

// Route to mark a student as absent with the current date in "DD-MM-YYYY" format
app.get("/mark-student-absent/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Get the current date in "DD-MM-YYYY" format
    const currentDate = new Date()
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .reverse()
      .join("-");

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Add the current date to the absentDates array
    student.absentDates.push(currentDate);

    // Remove the current date from the presentDates array (if it exists)
    const dateIndex = student.presentDates.indexOf(currentDate);
    if (dateIndex !== -1) {
      student.presentDates.splice(dateIndex, 1);
    }

    // Save the updated student data
    await student.save();

    res.status(200).json({ message: "Student marked as absent", student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark student as absent" });
  }
});

// LEAVE Request
// POST route to submit a leave request
app.post("/submit-leave-request/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { startDate, endDate, reason, ty } = req.body;

    // Find the teacher based on their loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Create a new leave request
    const leaveRequest = {
      startDate,
      endDate,
      reason,
      ty,
      status: "pending",
    };

    // Add the leave request to the teacher's leaveRequests array
    teacher.leaveRequests.push(leaveRequest);

    // Save the updated teacher document
    await teacher.save();

    res.status(200).json({ message: "Leave request submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit leave request" });
  }
});

// GET route to retrieve leave requests for a teacher
app.get("/leave-requests/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the teacher based on their loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Get the leave requests for the teacher
    const leaveRequests = teacher.leaveRequests;

    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

// PUT route to update the status of a leave request
app.put("/leave-request/:loginID/:requestID", async (req, res) => {
  try {
    const { loginID, requestID } = req.params;
    const { status } = req.body;

    // Find the teacher based on their loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Find the leave request by its ID
    const leaveRequest = teacher.leaveRequests.id(requestID);

    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    // Update the status of the leave request
    leaveRequest.status = status;

    // Save the updated teacher document
    await teacher.save();

    res
      .status(200)
      .json({ message: "Leave request status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update leave request status" });
  }
});

//Notifications By teacher and visible to students
app.post("/create-notification/:class/:section", async (req, res) => {
  try {
    const { class: section } = req.params;
    const { date, time, reason } = req.body;

    // Construct the event data
    const eventData = {
      date: date, // Format the date as needed
      time: time, // Format the time as needed
      reason: reason,
    };

    // Find students in the specified class and section
    const students = await Student.find({ class: section });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this class and section" });
    }

    // Add the notification to each student's notifications array
    students.forEach(async (student) => {
      student.notifications.push(eventData);
      await student.save();
    });

    res
      .status(200)
      .json({ message: "Notification created and sent to students" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create and send notifications" });
  }
});

// Route for monthly and yearky attendence
function getSundaysInMonth(year, month) {
  const firstDay = moment.tz([year, month - 1, 1], "Asia/Kolkata");
  const lastDay = moment
    .tz([year, month - 1, 1], "Asia/Kolkata")
    .endOf("month");

  let sundays = 0;
  while (firstDay.isSameOrBefore(lastDay)) {
    if (firstDay.day() === 0) {
      sundays++;
    }
    firstDay.add(1, "day");
  }
  return sundays;
}

function getDaysInMonth(year, month) {
  const firstDay = moment.tz([year, month - 1, 1], "Asia/Kolkata");
  const lastDay = moment
    .tz([year, month - 1, 1], "Asia/Kolkata")
    .endOf("month");
  return lastDay.diff(firstDay, "days") + 1;
}

//Monthly
app.get("/monthly-attendance/:loginID/:year/:month", async (req, res) => {
  try {
    const { loginID, year, month } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Extract and calculate attendance data
    const totalDays = getDaysInMonth(year, month);
    const totalSundays = getSundaysInMonth(year, month);
    const workingDays = totalDays - totalSundays;
    const presentCount = teacher.present.filter((entry) => {
      const entryDate = moment(entry.date, "YYYY-MM-DD");
      return entryDate.year() == year && entryDate.month() + 1 == month;
    }).length;

    const monthlyAttendance = {
      totalDays,
      workingDays,
      totalSundays,
      presentCount,
      year,
      month,
    };

    res.status(200).json(monthlyAttendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch monthly attendance" });
  }
});

//Yearly
app.get("/yearly-attendance/:loginID/:year", async (req, res) => {
  try {
    const { loginID, year } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const totalYearlyAttendance = {
      year,
      totalDays: 0,
      workingDays: 0,
      totalSundays: 0,
      presentCount: 0,
    };

    for (let month = 1; month <= 12; month++) {
      const totalDays = getDaysInMonth(year, month);
      const workingDays = totalDays - getSundaysInMonth(year, month);
      const presentCount = teacher.present.filter((entry) => {
        const entryDate = moment(entry.date, "YYYY-MM-DD");
        return entryDate.year() == year && entryDate.month() == month - 1;
      }).length;

      totalYearlyAttendance.totalDays += totalDays;
      totalYearlyAttendance.workingDays += workingDays;
      totalYearlyAttendance.totalSundays += getSundaysInMonth(year, month);
      totalYearlyAttendance.presentCount += presentCount;
    }

    res.status(200).json(totalYearlyAttendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch yearly attendance" });
  }
});

// Import necessary modules and set up your Express app

// Add a route to get all teachers
app.get("/teachers", async (req, res) => {
  try {
    // Retrieve all teacher records from the database
    const teachers = await Teacher.find();

    // Send the list of teachers as a JSON response
    res.status(200).json(teachers);
  } catch (error) {
    // Handle any errors that occur during the database query
    res.status(500).json({ error: "Could not fetch teachers" });
  }
});

app.get("/yearlyMonthAttendance/:loginID/:year", async (req, res) => {
  try {
    const { loginID, year } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const yearlyAttendance = [];

    for (let month = 0; month < 12; month++) {
      const totalDays = getDaysInMonth(year, month + 1);
      const workingDays = totalDays - getSundaysInMonth(year, month + 1);
      const presentCount = teacher.present.filter((entry) => {
        const entryDate = moment(entry.date, "YYYY-MM-DD");
        return entryDate.year() == year && entryDate.month() == month;
      }).length;

      const monthYearly = {
        totalDays,
        workingDays,
        totalSundays: getSundaysInMonth(year, month + 1),
        presentCount,
        month: monthNames[month],
        year,
      };

      yearlyAttendance.push(monthYearly);
    }

    const totalYearlyAttendance = {
      year,
      months: yearlyAttendance,
    };

    res.status(200).json(totalYearlyAttendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch yearly attendance" });
  }
});


const homeworkSchema = new mongoose.Schema({
  title: String,
  description: String,
  class: String,
  section: String,
  subject: String,
  Date: String,
});

const Homework = mongoose.model("Homework", homeworkSchema);

// Route for managing homework assignments
app.post("/homework/:className/:section/:subject", async (req, res) => {
  try {
    const { className, section, subject } = req.params;
    const { title, description, d } = req.body;

    // Create a new homework assignment
    const homework = new Homework({
      title,
      description,
      class: className,
      section: section,
      subject,
      Date: d,
    });

    // Save the homework assignment to the database
    await homework.save();

    res.status(200).json({ message: "Homework added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add homework" });
  }
});


async function getImageBase64(imagePath) {
  try {
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    return base64Image;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to read image file");
  }
}

// Route for getting Homework
app.get("/homework/:className/:sec/:date", async (req, res) => {
  try {
    const { className, sec, date } = req.params;

    // Find homework assignments based on class and subject
    const homeworkAssignments = await Homework.find({
      class: className,
      section: sec,
      Date: date,
    });

    if (homeworkAssignments.length === 0) {
      return res.status(404).json({
        message: "No homework assignments found for this class and subject",
      });
    }

    // Add base64 image path based on conditions
    const assignmentsWithImages = await Promise.all(homeworkAssignments.map(async (assignment) => {
      let base64Image = null;

      if (assignment.subject === 'English Grammer') {
        const imagePath = './SubjectImages/eng gr.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Maths') {
        const imagePath = './SubjectImages/maths.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'English 1') {
        const imagePath = './SubjectImages/eng.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Hindi 1') {
        const imagePath = './SubjectImages/hindi.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Hindi Grammer') {
        const imagePath = './SubjectImages/hindi gr.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'English') {
        const imagePath = './SubjectImages/eng.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Hindi') {
        const imagePath = './SubjectImages/hindi.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'EVS') {
        const imagePath = './SubjectImages/evs.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'GK') {
        const imagePath = './SubjectImages/gk.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Computer') {
        const imagePath = './SubjectImages/comp.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Art & Craft') {
        const imagePath = './SubjectImages/art.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'SST') {
        const imagePath = './SubjectImages/sst.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Sanskrit') {
        const imagePath = './SubjectImages/sans.jpg';
        base64Image = await getImageBase64(imagePath);
      } else if (assignment.subject === 'Science') {
        const imagePath = './SubjectImages/sci.jpg';
        base64Image = await getImageBase64(imagePath);
      }

      return { ...assignment._doc, base64Image };
    }));

    res.status(200).json(assignmentsWithImages);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch homework assignments" });
  }
});


// Route to get all sections of a specific class
app.get("/get-sections/:class", async (req, res) => {
  try {
    const { class: className } = req.params; // Rename 'class' to 'className' to avoid conflicts

    // Find all unique sections for the given class
    const sections = await Student.distinct("section", { class: className });

    if (sections.length === 0) {
      return res
        .status(404)
        .json({ message: "No sections found for this class" });
    }

    res.status(200).json({ sections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

//Route to calculate the salary of the employee
app.get(
  "/calculate-teacher-monthly-salary/:loginID/:year/:month",
  async (req, res) => {
    try {
      const { loginID, year, month } = req.params;

      // Find the teacher by loginID
      const teacher = await Teacher.findOne({ loginID });

      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      const targetMonth = parseInt(month);
      const targetYear = parseInt(year);

      // Calculate the total days in the specified month
      const totalDays = new Date(targetYear, targetMonth, 0).getDate();

      // Filter the teacher's attendance records for the specified month and year
      const monthlyAttendance = teacher.present.filter((entry) => {
        const entryDate = entry.date.split("-").map(Number);
        return entryDate[0] === targetYear && entryDate[1] === targetMonth;
      });

      // Calculate the teacher's salary based on total working days and total present days
      const totalWorkingDays =
        totalDays - getSundaysInMonth(targetYear, targetMonth);
      const totalPresentDays = monthlyAttendance.length;

      if (totalWorkingDays === 0) {
        return res
          .status(400)
          .json({ message: "No working days in the specified month" });
      }

      const monthlySalary = (
        (teacher.salary / totalWorkingDays) *
        totalPresentDays
      ).toFixed(0);

      // Extract dates for which the teacher is present and absent in the specified month
      const presentDates = monthlyAttendance.map((entry) => entry.date);
      const absentDates = teacher.absent.filter((entry) => {
        const entryDate = entry.toISOString().split("T")[0]; // Convert Date object to string in "YYYY-MM-DD" format
        return entryDate.startsWith(`${year}-${month}`);
      });

      res.status(200).json({
        thisMonthSalary: monthlySalary,
        totalSalary: teacher.salary,
        totalDays: totalWorkingDays,
        totalPresentDays: totalPresentDays,
        presentDates: presentDates,
        absentDates: absentDates,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to calculate monthly salary" });
    }
  }
);

//Salary-history
app.get("/teacher-salary-history/:loginID/:year/:month", async (req, res) => {
  try {
    const { loginID, year, month } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    const salaryHistory = [];

    for (let m = 1; m <= targetMonth; m++) {
      const totalDays = new Date(targetYear, m, 0).getDate();
      const monthlyAttendance = teacher.present.filter((entry) => {
        const entryDate = entry.date.split("-").map(Number);
        return entryDate[0] === targetYear && entryDate[1] === m;
      });

      const totalWorkingDays = totalDays - getSundaysInMonth(targetYear, m);
      const totalPresentDays = monthlyAttendance.length;
      const monthlySalary = (
        (teacher.salary / totalWorkingDays) *
        totalPresentDays
      ).toFixed(0);

      // Get the month name
      const monthName = new Date(targetYear, m - 1, 1).toLocaleString(
        "default",
        { month: "long" }
      );

      salaryHistory.push({
        month: monthName,
        montNumber: m,
        year: targetYear,
        attendence: totalPresentDays,
        salary: monthlySalary,
      });
    }

    res.status(200).json(salaryHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch salary history" });
  }
});

//Get Students by its class and section
app.get("/get-students/:class/:section", async (req, res) => {
  try {
    const className = req.params.class;
    const section = req.params.section;

    // Find students in the specified class and section
    const students = await Student.find({ class: className, section });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this class and section" });
    }

    // Extract loginID and name of each student
    const studentData = students.map((student) => ({
      loginID: student.loginID,
      name: student.name,
      class: `${className}-${section}`,
    }));

    res.status(200).json(studentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

//Complaint by teacher for student
app.post("/submit-student-complaint/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { title, teacherName, date, complaintText } = req.body;

    // Find the student based on their loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create a new complaint
    const complaint = {
      title,
      teacherName,
      date,
      complaintText,
    };

    // Add the complaint to the student's complaints array
    student.complaints.push(complaint);

    // Save the updated student document
    await student.save();

    res.status(200).json({ message: "Complaint submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

// Define a route for a teacher to add feedback to a student
app.post("/add-student-feedback/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { feedbackDate, feedbackText, teacherName, feedbackTitle } = req.body;

    // Find the student based on their loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create a new feedback entry
    const feedbackEntry = {
      teacherName, // Name of the teacher providing the feedback
      date: feedbackDate, // Date of the feedback entry in "DD-MM-YYYY" format
      text: feedbackText, // Feedback text
      title: feedbackTitle,
    };

    // Add the feedback entry to the student's feedback array
    student.feedback.push(feedbackEntry);

    // Save the updated student document
    await student.save();

    res.status(200).json({ message: "Feedback added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add feedback" });
  }
});

// Create a new Mongoose model for exams
const examSchema = new mongoose.Schema({
  class: String, // Class for which the exam is conducted
  section: String, // Section of the class
  subject: String, // Subject name for the exam
  examType: String, // Type of the exam (e.g., 'Mid-term', 'Final')
  examSubType: String, // Subtype of the exam (e.g., 'Unit Test 1', 'Unit Test 2')
  maxMarks: Number, // Maximum marks for the exam
  date: String,
  time: String,
});

const Exam = mongoose.model("Exam", examSchema);

// Route for a teacher to create a new exam
app.post("/create-exam", async (req, res) => {
  try {
    const {
      class: section,
      subject,
      examType,
      examSubType,
      maxMarks,
      date,
      time,
    } = req.body;

    // Create a new exam document
    const exam = new Exam({
      class: section,
      subject,
      examType,
      examSubType,
      maxMarks,
      date,
      time,
    });

    // Save the new exam document
    await exam.save();

    res
      .status(200)
      .json({ message: "Exam created successfully", ID: exam._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create the exam" });
  }
});

app.post("/upload-exam-marks/:examID/:cl/:section", async (req, res) => {
  try {
    const { examID, cl, section } = req.params;
    const { marks } = req.body; // Marks data

    // Fetch the list of students based on class and section
    const response = await axios.get(
      `https://schoolapi-3yo0.onrender.com/get-students/${cl}/${section}`
    );
    const students = response.data;

    // Check if the length of the students matches the number of marks
    if (students.length !== marks.length) {
      return res
        .status(400)
        .json({ error: "Number of students and marks do not match" });
    }

    // Iterate through the students and update their exam marks
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const mark = marks[i];

      // Find the student in your database by loginID
      const studentInDB = await Student.findOne({ loginID: student.loginID });

      if (!studentInDB) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Update the student's exam marks in the database
      studentInDB.examMarks.push({ examID, mark });
      await studentInDB.save();
    }

    res.status(200).json({ message: "Exam marks uploaded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload exam marks" });
  }
});

app.post("/add-lesson-plan/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { cls, section, date, subject, content } = req.body;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Create a new lesson plan object
    const lessonPlan = {
      cls,
      section,
      date: date,
      subject,
      content,
    };

    // Add the lesson plan to the teacher's lessonPlans array
    teacher.lessonPlans.push(lessonPlan);

    // Save the updated teacher document
    await teacher.save();

    res.status(200).json({ message: "Lesson plan added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add lesson plan" });
  }
});

// Route to get a student's monthly attendance
app.get(
  "/student-monthly-attendance/:loginID/:year/:month",
  async (req, res) => {
    try {
      const { loginID, year, month } = req.params;

      // Find the student by loginID
      const student = await Student.findOne({ loginID });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const targetMonth = parseInt(month);
      const targetYear = parseInt(year);

      // Calculate the total days in the specified month
      const totalDays = new Date(targetYear, targetMonth, 0).getDate();

      // Filter and count the student's attendance records for the specified month and year
      const monthlyAttendance = student.presentDates.filter((date) => {
        const dateParts = date.split("-");
        if (dateParts.length === 3) {
          // Date is in "YYYY-MM-DD" format
          const [yr, mon, day] = dateParts.map(Number);
          return yr === targetYear && mon === targetMonth && day <= totalDays;
        } else {
          // Attempt to parse the date in various formats
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            const mon = parsedDate.getMonth() + 1; // Months are zero-based
            const day = parsedDate.getDate();
            return mon === targetMonth && day <= totalDays;
          }
        }
        return false;
      });

      // Calculate the working days (excluding Sundays)
      const totalWorkingDays = totalDays;

      // Calculate the present days for the month
      const presentCount = monthlyAttendance.length;

      // Response data
      const monthlyAttendanceData = {
        year: year,
        month: month,
        totalDays: totalDays,
        workingDays: totalWorkingDays,
        totalSundays: 0,
        presentCount: presentCount,
      };

      res.status(200).json(monthlyAttendanceData);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to fetch student monthly attendance" });
    }
  }
);

app.get("/student-monthly-attendance/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the current date to determine the present month and year
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth() + 1; // Adding 1 to get the correct month (zero-based index)
    const targetYear = currentDate.getFullYear();

    // Calculate the total days in the present month
    const totalDays = new Date(targetYear, targetMonth, 0).getDate();

    // Filter and count the student's attendance records for the present month and year
    const monthlyAttendance = student.presentDates.filter((date) => {
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        // Date is in "YYYY-MM-DD" format
        const [yr, mon, day] = dateParts.map(Number);
        return yr === targetYear && mon === targetMonth && day <= totalDays;
      } else {
        // Attempt to parse the date in various formats
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const mon = parsedDate.getMonth() + 1; // Months are zero-based
          const day = parsedDate.getDate();
          return mon === targetMonth && day <= totalDays;
        }
      }
      return false;
    });

    // Filter and count the student's attendance records for the present month and year
    const monthlyabsent = student.absentDates.filter((date) => {
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        // Date is in "YYYY-MM-DD" format
        const [yr, mon, day] = dateParts.map(Number);
        return yr === targetYear && mon === targetMonth && day <= totalDays;
      } else {
        // Attempt to parse the date in various formats
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const mon = parsedDate.getMonth() + 1; // Months are zero-based
          const day = parsedDate.getDate();
          return mon === targetMonth && day <= totalDays;
        }
      }
      return false;
    });

    // Calculate the working days (excluding Sundays)
    const totalWorkingDays =
      totalDays -
      monthlyAttendance.filter((date) => {
        const parsedDate = new Date(date);
        return parsedDate.getDay() === 0; // Sunday (0)
      }).length;

    // Calculate the present days for the month
    const presentCount = monthlyAttendance.length;
    const absentCount = monthlyabsent.length;

    // Calculate the total Sundays in the month
    const totalSundays = new Array(totalDays)
      .fill(0)
      .map((_, day) => new Date(targetYear, targetMonth - 1, day + 1))
      .filter((date) => date.getDay() === 0).length; // Filter for Sundays

    // Response data
    const monthlyAttendanceData = {
      year: targetYear,
      month: targetMonth,
      totalDays: totalDays,
      workingDays: totalDays - totalSundays, // Total working days (excluding Sundays)
      totalSundays: totalSundays,
      presentCount: presentCount,
      absentCount: absentCount,
      presentDates: monthlyAttendance, // List of present dates
      absentDates: student.absentDates, // List of absent dates from the student schema
    };

    res.status(200).json(monthlyAttendanceData);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch student monthly attendance" });
  }
});

// Route to get a student's monthly attendance
app.get("/student-monthly-absent/:loginID/:year/:month", async (req, res) => {
  try {
    const { loginID, year, month } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    // Calculate the total days in the specified month
    const totalDays = new Date(targetYear, targetMonth, 0).getDate();

    // Filter and count the student's attendance records for the specified month and year
    const monthlyAttendance = student.absentDates.filter((date) => {
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        // Date is in "YYYY-MM-DD" format
        const [yr, mon, day] = dateParts.map(Number);
        return yr === targetYear && mon === targetMonth && day <= totalDays;
      } else {
        // Attempt to parse the date in various formats
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const mon = parsedDate.getMonth() + 1; // Months are zero-based
          const day = parsedDate.getDate();
          return mon === targetMonth && day <= totalDays;
        }
      }
      return false;
    });

    // Calculate the working days (excluding Sundays)
    const totalWorkingDays = totalDays;

    // Calculate the present days for the month
    const presentCount = monthlyAttendance.length;

    // Response data
    const monthlyAttendanceData = {
      year: year,
      month: month,
      totalDays: totalDays,
      workingDays: totalWorkingDays,
      totalSundays: 0,
      presentCount: presentCount,
    };

    res.status(200).json(monthlyAttendanceData);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch student monthly attendance" });
  }
});

// Route to get a student's monthly attendance for the present month and year
app.get("/student-monthly-absent/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the current date to determine the present month and year
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth() + 1; // Adding 1 to get the correct month (zero-based index)
    const targetYear = currentDate.getFullYear();

    // Calculate the total days in the present month
    const totalDays = new Date(targetYear, targetMonth, 0).getDate();

    // Filter and count the student's attendance records for the present month and year
    const monthlyAttendance = student.absentDates.filter((date) => {
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        // Date is in "YYYY-MM-DD" format
        const [yr, mon, day] = dateParts.map(Number);
        return yr === targetYear && mon === targetMonth && day <= totalDays;
      } else {
        // Attempt to parse the date in various formats
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const mon = parsedDate.getMonth() + 1; // Months are zero-based
          const day = parsedDate.getDate();
          return mon === targetMonth && day <= totalDays;
        }
      }
      return false;
    });

    // Calculate the working days (excluding Sundays)
    const totalWorkingDays = totalDays;

    // Calculate the present days for the month
    const presentCount = monthlyAttendance.length;

    // Response data
    const monthlyAttendanceData = {
      year: targetYear,
      month: targetMonth,
      totalDays: totalDays,
      workingDays: totalWorkingDays,
      totalSundays: 0,
      presentCount: presentCount,
    };

    res.status(200).json(monthlyAttendanceData);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch student monthly attendance" });
  }
});

// Route to get all notifications for a student by loginID
app.get("/student-notifications/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the student's notifications
    const notifications = student.notifications;

    res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student notifications" });
  }
});

// Route to get all complaints for a student by loginID
app.get("/student-complaints/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the student's complaints
    const complaints = student.complaints;

    res.status(200).json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student complaints" });
  }
});

// Route to get all complaints for a student by loginID
app.get("/student-feedback/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the student's complaints
    const feedback = student.feedback;

    res.status(200).json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student complaints" });
  }
});

// Route to get student performance by loginID
app.get("/student-performance/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Fetch the student's exam marks
    const examMarks = student.examMarks;

    // Prepare the response array
    const performance = [];

    // Iterate through the examMarks and retrieve exam details
    for (const examMark of examMarks) {
      const examID = examMark.examID;
      const mark = examMark.mark;

      // Find the exam by examID
      const exam = await Exam.findById(examID);

      if (exam) {
        const examInfo = {
          examType: exam.examType,
          subject: exam.subject,
          examSubType: exam.examSubType,
          maxMarks: exam.maxMarks,
          mark,
        };
        performance.push(examInfo);
      }
    }

    // Prepare the response
    const response = {
      performance,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student performance" });
  }
});

//Subjects Route
app.get("/subjects/:className/:section/:date", async (req, res) => {
  try {
    const { className, section, date } = req.params;

    // Find homework assignments based on class and subject
    const subjects = await Homework.find({
      class: className,
      section,
      date,
    });

    if (subjects.length === 0) {
      return res.status(404).json({
        message: "No homework on this day",
      });
    }

    const subjectList = subjects.map((subject) => subject.subject);

    res.status(200).json(subjectList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch homework assignments" });
  }
});

// Define your timetable schema
const timetableSchema = new mongoose.Schema({
  class: String,
  section: String,
  timetable: {
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {},
    saturday: {},
  },
});

const Timetable = mongoose.model("Timetable", timetableSchema);

// Create a new timetable
app.post("/create-timetable/:cla/:sec", async (req, res) => {
  try {
    const { cla, sec } = req.params;
    const { timetable } = req.body;

    const newTimetable = new Timetable({
      class: cla,
      section: sec,
      timetable,
    });

    await newTimetable.save();

    res.status(201).json({ message: "Timetable created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create timetable" });
  }
});

// Retrieve a timetable by class and section
app.get("/get-timetable/:cla/:sec", async (req, res) => {
  try {
    const { cla, sec } = req.params;

    const timetable = await Timetable.findOne({ class: cla, section: sec });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    res.status(200).json(timetable);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// ======================== Time Table Ends ============================

// Add Total Fees for a Student
app.post("/add-total-fees/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { totalFees } = req.body;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Calculate the quarterly fees
    const quarterlyFee = totalFees / 3;

    // Initialize feesDistributions with quarterly data
    student.feesDistributions = [
      {
        quarter: "Apr-Jul",
        totalQuarterlyFees: quarterlyFee,
        feesPaid: 0,
        modeOfPayment: "",
      },
      {
        quarter: "Aug-Nov",
        totalQuarterlyFees: quarterlyFee,
        feesPaid: 0,
        modeOfPayment: "",
      },
      {
        quarter: "Dec-Mar",
        totalQuarterlyFees: quarterlyFee,
        feesPaid: 0,
        modeOfPayment: "",
      },
      // { quarter: 'Q4', totalQuarterlyFees: quarterlyFee, feesPaid: 0, modeOfPayment: '' },
    ];

    // Set the total fees
    student.totalFees = totalFees;

    // Save the updated student document
    await student.save();

    res.status(200).json({ message: "Total fees added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add total fees" });
  }
});

// Pay Fees for a Specific Quarter
app.post("/pay-fees/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { quarter, amountPaid, modeOfPayment } = req.body;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Find the corresponding quarter in feesDistributions
    const quarterIndex = student.feesDistributions.findIndex(
      (qtr) => qtr.quarter === quarter
    );

    if (quarterIndex === -1) {
      return res.status(404).json({ error: "Quarter not found" });
    }

    // Update feesPaid and modeOfPayment for the selected quarter
    student.feesDistributions[quarterIndex].feesPaid = amountPaid;
    student.feesDistributions[quarterIndex].modeOfPayment = modeOfPayment;

    // Update total fees balance
    const totalFeesPaid = student.feesDistributions.reduce(
      (sum, qtr) => sum + qtr.feesPaid,
      0
    );

    student.totalFees = student.totalFees - totalFeesPaid;

    // Save the updated student document
    await student.save();

    res.status(200).json({ message: "Fees payment successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to pay fees" });
  }
});

// View Total Fees for a Student
app.get("/view-total-fees/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json({ totalFees: student.totalFees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch total fees" });
  }
});

// View Quarterwise Fees Distribution
app.get("/view-quarterwise-fees/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });
    function roundOffFees(response) {
      response.forEach(distribution => {
        distribution.totalQuarterlyFees = Math.round(distribution.totalQuarterlyFees);
      });
      return response;
    }

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json({ feesDistributions: roundOffFees(student.feesDistributions) });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch quarterwise fees" });
  }
});

// View Payment History for a Student
app.get("/view-payment-history/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Extract payment history from feesDistributions
    const paymentHistory = student.feesDistributions.map((qtr) => ({
      quarter: qtr.quarter,
      feesPaid: qtr.feesPaid,
      modeOfPayment: qtr.modeOfPayment,
    }));

    res.status(200).json({ paymentHistory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

// =======================================================================

// Route to get students with a birthday today
app.get("/students-birthday-today/:cls", async (req, res) => {
  try {
    // Calculate today's date and extract day and month
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.toLocaleString('default', { month: 'short' }); // Getting the three-letter month abbreviation

    const { cls } = req.params; // Note: 'sec' removed since it's not used in the commented-out part

    // Find students in the specified class whose DOB matches today's date
    const studentsWithBirthdayToday = await Student.find({
      class: cls,
    });

    // Filter students whose birthday matches today
    const studentsToday = studentsWithBirthdayToday.filter((student) => {
      if (student.DOB) {
        const dobParts = student.DOB.split('-');
        if (dobParts.length === 3) {
          const dobDay = parseInt(dobParts[0], 10);
          const dobMonth = dobParts[1]; // Directly compare the string month part

          return dobDay === todayDay && dobMonth.toUpperCase() === todayMonth.toUpperCase();
        }
      }
      return false;
    });

    const studentDetails = studentsToday.map((student) => ({
      name: student.name,
      class: student.class,
      section: student.section,
      loginID: student.loginID,
    }));

    res.status(200).json(studentDetails);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch students with birthdays today" });
  }
});


// =======================================================================

// Notice Board Schema
const noticeSchema = new mongoose.Schema({
  date: String, // Date of the notice in "DD-MM-YYYY" format
  time: String, // Time of the notice
  title: String, // Title of the notice
  description: String, // Description or content of the notice
});
const Notice = mongoose.model("Notice", noticeSchema);

// Route to post a notice
app.post("/post-notice", async (req, res) => {
  try {
    const { date, time, title, description } = req.body;

    // Create a new notice
    const notice = new Notice({ date, time, title, description });

    // Save the notice to the database
    await notice.save();

    res.status(201).json({ message: "Notice posted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to post notice" });
  }
});

// Route to get all notices
app.get("/get-notices", async (req, res) => {
  try {
    // Retrieve all notices from the database
    const notices = await Notice.find();

    res.status(200).json(notices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch notices" });
  }
});

// Delete a notice by ID
app.delete('/notices/:id', async (req, res) => {
  const noticeId = req.params.id;

  try {
    // Check if the notice exists
    const existingNotice = await Notice.findById(noticeId);

    if (!existingNotice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    // Delete the notice
    await Notice.findByIdAndDelete(noticeId);

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get("/upcoming-birthday/:cls", async (req, res) => {
  try {
    const today = new Date();
    const todayMonth = today.toLocaleString('default', { month: 'short' }).toUpperCase(); // Get the three-letter month abbreviation in uppercase
    const todayDay = today.getDate();

    const { cls } = req.params;

    // Find students in the specified class
    const studentsInClass = await Student.find({ class: cls });

    // Function to convert month abbreviation to its numeric value
    const monthToNumber = (month) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months.indexOf(month) + 1;
    };

    // Filter students with upcoming birthdays within the same month
    const upcomingBirthdays = studentsInClass.filter((student) => {
      if (student.DOB) {
        const dobParts = student.DOB.split("-");
        if (dobParts.length === 3) {
          const dobDay = parseInt(dobParts[0], 10);
          const dobMonthAbbr = dobParts[1].toUpperCase(); // Ensure uppercase for comparison

          // Check if the birthday month is the same as the current month and the day is after today
          return dobMonthAbbr === todayMonth && dobDay > todayDay;
        }
      }
      return false;
    });

    // Map desired details for response
    const studentDetails = upcomingBirthdays.map((student) => ({
      name: student.name,
      class: student.class,
      section: student.section,
      loginID: student.loginID,
      DOB: student.DOB,
    }));

    res.status(200).json(studentDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students with upcoming birthdays within the same month" });
  }
});


// ==========================================================

app.get("/get-timetable/:cls/:sec", async (req, res) => {
  try {
    const { cls, sec } = req.params;

    // Find the timetable entry based on the class and section
    const timetable = await Timetable.findOne({ class: cls, section: sec });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found" });
    }

    // Return the timetable for the specified class and section
    res.status(200).json({ timetable: timetable.timetable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch timetable" });
  }
});

// ==========================================================

app.get("/student-monthly-report/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the current date to determine the present month and year
    const currentDate = new Date();
    const targetMonth = currentDate.getMonth() + 1;  // Adding 1 to get the correct month (zero-based index)
    const targetYear = currentDate.getFullYear();
    // console.log(targetMonth);

    // Calculate the total days in the present month
    const totalDays = new Date(targetYear, targetMonth, 0).getDate();
    // console.log(totalDays);

    // Filter and count feedback, complaints, and marks for the present month
    const monthlyFeedback = student.feedback.filter((entry) => {
      const entryDate = entry.date.split("-");
      const month = parseInt(entryDate[1], 10);
      const year = parseInt(entryDate[2], 10);
      return month === targetMonth && year === targetYear;
    });

    const monthlyComplaints = student.complaints.filter((entry) => {
      const entryDate = entry.date.split("-");
      const month = parseInt(entryDate[1], 10);
      const year = parseInt(entryDate[2], 10);
      return month === targetMonth && year === targetYear;
    });

    // Get all exam IDs for the student
    const examIDs = student.examMarks.map((entry) => entry.examID);

    // Fetch all exams for the student
    const exams = await Exam.find({ _id: { $in: examIDs } });


    // Define an object to store the monthly marks
    const monthlyMarks = {};

    // Filter exams for the present month
    exams.forEach((exam) => {
      if (exam.date) {
        const examDate = exam.date.split("-");
        const month = parseInt(examDate[1], 10);
        const year = parseInt(examDate[2], 10);


        if (month === targetMonth && year === targetYear) {
          // console.log("exam") ;
          // This exam is in the current month, process its marks

          // Define the structure for this exam type if it doesn't exist
          monthlyMarks[exam.examType] = monthlyMarks[exam.examType] || {};

          // Define the structure for this exam subtype if it doesn't exist
          monthlyMarks[exam.examType][exam.examSubType] =
            monthlyMarks[exam.examType][exam.examSubType] || { subjects: [], maxMarks: [], marks: [] };

          // Store the marks for this subject
          monthlyMarks[exam.examType][exam.examSubType].subjects.push(exam.subject);
          monthlyMarks[exam.examType][exam.examSubType].maxMarks.push(exam.maxMarks);
          monthlyMarks[exam.examType][exam.examSubType].marks.push(
            student.examMarks.find((entry) => entry.examID === exam._id.toString())?.mark || 0
          );
        }
      }
    });

    // Now, monthlyMarks should contain the structured marks for the current month
    // console.log(monthlyMarks);

    // Response data
    const monthlyReport = {
      year: targetYear,
      month: targetMonth,
      feedback: monthlyFeedback,
      complaints: monthlyComplaints,
      marks: monthlyMarks,
    };

    res.status(200).json(monthlyReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student monthly report" });
  }
});

// ==========================================================

app.get("/student-yearly-report/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the student by loginID
    const student = await Student.findOne({ loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get the current date to determine the present month and year
    const currentDate = new Date();
    const targetYear = currentDate.getFullYear();


    // Filter and count feedback, complaints, and marks for the present month
    const yearlyFeedback = student.feedback.filter((entry) => {
      const entryDate = entry.date.split("-");
      const year = parseInt(entryDate[2], 10);
      return year === targetYear;
    });

    const yearlyComplaints = student.complaints.filter((entry) => {
      const entryDate = entry.date.split("-");
      const year = parseInt(entryDate[2], 10);
      return year === targetYear;
    });

    // Get all exam IDs for the student
    const examIDs = student.examMarks.map((entry) => entry.examID);

    // Fetch all exams for the student
    const exams = await Exam.find({ _id: { $in: examIDs } });


    // Define an object to store the monthly marks
    const yearlyMarks = {};

    // Filter exams for the present month
    exams.forEach((exam) => {
      if (exam.date) {
        const examDate = exam.date.split("-");
        const year = parseInt(examDate[2], 10);

        if (year === targetYear) {
          // This exam is in the current month, process its marks

          // Define the structure for this exam type if it doesn't exist
          yearlyMarks[exam.examType] = yearlyMarks[exam.examType] || {};

          // Define the structure for this exam subtype if it doesn't exist
          yearlyMarks[exam.examType][exam.examSubType] =
            yearlyMarks[exam.examType][exam.examSubType] || { subjects: [], maxMarks: [], marks: [] };

          // Store the marks for this subject
          yearlyMarks[exam.examType][exam.examSubType].subjects.push(exam.subject);
          yearlyMarks[exam.examType][exam.examSubType].maxMarks.push(exam.maxMarks);
          yearlyMarks[exam.examType][exam.examSubType].marks.push(
            student.examMarks.find((entry) => entry.examID === exam._id.toString())?.mark || 0
          );
        }
      }
    });

    // Now, monthlyMarks should contain the structured marks for the current month
    // console.log(monthlyMarks);

    // Response data
    const yearlyReport = {
      year: targetYear,
      feedback: yearlyFeedback,
      complaints: yearlyComplaints,
      marks: yearlyMarks,
    };

    res.status(200).json(yearlyReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch student monthly report" });
  }
});

// ==========================================================

app.post("/student-submit-leave-request/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;
    const { startDate, endDate, reason, ty, classTeacher } = req.body;

    // Find the teacher based on their loginID
    const teacher = await Student.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Create a new leave request
    const leaveRequest = {
      startDate,
      endDate,
      reason,
      ty,
      classTeacher,
      status: "pending",
    };

    // Add the leave request to the teacher's leaveRequests array
    teacher.leaveRequests.push(leaveRequest);

    // Save the updated teacher document
    await teacher.save();

    res.status(200).json({ message: "Leave request submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit leave request" });
  }
});

// GET route to retrieve leave requests for a teacher
app.get("/student-leave-requests/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the teacher based on their loginID
    const teacher = await Student.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Get the leave requests for the teacher
    const leaveRequests = teacher.leaveRequests;

    res.status(200).json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

// PUT route to update the status of a leave request
app.put("/student-leave-request/:loginID/:requestID", async (req, res) => {
  try {
    const { loginID, requestID } = req.params;
    const { status } = req.body;

    // Find the teacher based on their loginID
    const teacher = await Student.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Find the leave request by its ID
    const leaveRequest = teacher.leaveRequests.id(requestID);

    if (!leaveRequest) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    // Update the status of the leave request
    leaveRequest.status = status;

    // Save the updated teacher document
    await teacher.save();

    res
      .status(200)
      .json({ message: "Leave request status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update leave request status" });
  }
});


// Calculate the sum of all students' fees
app.get('/total-fees', async (req, res) => {
  try {
    const students = await Student.find({});
    let totalFeesSum = 0;

    for (const student of students) {
      if (student.totalFees) {
        totalFeesSum += student.totalFees;
      }
    }

    res.json({ totalFeesSum });
  } catch (error) {
    res.status(500).json({ error: 'Error calculating total fees.' });
  }
});

// Calculate the sum of all students' paid fees
app.get('/total-paid-fees', async (req, res) => {
  try {
    const students = await Student.find({});
    let totalPaidFeesSum = 0;

    for (const student of students) {
      for (const feesDistribution of student.feesDistributions) {
        if (feesDistribution.feesPaid) {
          totalPaidFeesSum += feesDistribution.feesPaid;
        }
      }
    }

    res.json({ totalPaidFeesSum });
  } catch (error) {
    res.status(500).json({ error: 'Error calculating total paid fees.' });
  }
});

// Add this route to your existing code
app.get('/total-students', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({});
    res.json({ totalStudents });
  } catch (error) {
    res.status(500).json({ error: 'Error counting total students.' });
  }
});

app.get('/total-teachers', async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments({});
    res.json({ totalTeachers });
  } catch (error) {
    res.status(500).json({ error: 'Error counting total students.' });
  }
});


app.get('/recent-fee-payments', async (req, res) => {
  try {
    const studentsWithRecentPayments = await Student.aggregate([
      {
        $match: {
          'feesDistributions.feesPaid': { $gt: 0 },
        },
      },
      {
        $project: {
          _id: 0,
          name: 1,
          class: 1,
          section: 1,
          feesDistributions: {
            $filter: {
              input: '$feesDistributions',
              as: 'fee',
              cond: { $gt: ['$$fee.feesPaid', 0] },
            },
          },
        },
      },
    ]);

    res.json(studentsWithRecentPayments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching recent fee payments.' });
  }
});

// Get the count and details of visitors for today
app.get('/visitors-today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in the format 'YYYY-MM-DD'

  try {
    const visitorsToday = await Visitor.find({ visitDate: today });
    const visitorCount = visitorsToday.length;

    res.json({
      totalVisitors: visitorCount,
      visitors: visitorsToday,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching visitors for today.' });
  }
});

// Get the count of students present today
app.get('/students-present-today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in the format 'YYYY-MM-DD'

  try {
    const studentsPresentToday = await Student.find({
      presentDates: { $in: [today] },
    });
    const studentCount = studentsPresentToday.length;

    res.json({
      totalStudentsPresent: studentCount
      // students: studentsPresentToday,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching students present today.' });
  }
});


// Get the count of teachers present today
app.get('/teachers-present-today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in the format 'YYYY-MM-DD'

  try {
    const teachersPresentToday = await Teacher.find({
      'present.date': today,
    });
    const teacherCount = teachersPresentToday.length;

    res.json({
      totalTeachersPresent: teacherCount,
      // teachers: teachersPresentToday,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching teachers present today.' });
  }
});

app.get("/all-buses", async (req, res) => {
  try {
    // Retrieve all teacher records from the database
    const buses = await Bus.find();

    // Send the list of teachers as a JSON response
    res.status(200).json(buses);
  } catch (error) {
    // Handle any errors that occur during the database query
    res.status(500).json({ error: "500 - Could not fetch Buses" });
  }
});

// Retrieve all exams by class and section
app.get("/get-exams/:cla", async (req, res) => {
  try {
    const { cla } = req.params;

    const exams = await Exam.find({ class: cla });

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "Exams not found for this class" });
    }

    res.status(200).json(exams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch Exams" });
  }
});

app.get("/expenses-chart", async (req, res) => {
  try {
    const students = await Student.find({});
    let totalFeesSum = 0;

    for (const student of students) {
      if (student.totalFees) {
        totalFeesSum += student.totalFees;
      }
    }

    let totalPaidFeesSum = 0;

    for (const student of students) {
      for (const feesDistribution of student.feesDistributions) {
        if (feesDistribution.feesPaid) {
          totalPaidFeesSum += feesDistribution.feesPaid;
        }
      }
    }
    const presentCount = totalFeesSum;
    const absentCount = totalPaidFeesSum;

    // Generate the chart as HTML
    const chartHtml = `
        <html>
          <head>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          </head>
          <body>
            <canvas id="statusChart" width="400" height="200"></canvas>
            <script>
              const ctx = document.getElementById('statusChart').getContext('2d');
              const chartConfig = {
                type: 'pie',
                data: {
                  labels: ['Total Fees', 'Total Paid Fees'],
                  datasets: [{
                    data: [${presentCount}, ${absentCount}],
                    backgroundColor: ['#c2380f', '#045a8d'],
                  }],
                },
              };
              new Chart(ctx, chartConfig);
            </script>
          </body>
        </html>
      `;

    // Set the content type to HTML and send the chart as an HTML response
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate chart" });
  }
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  date: { type: Date, default: Date.now },
});

const Expense = mongoose.model('Expense', expenseSchema);

// Middleware
app.use(bodyParser.json());

// Routes
app.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/expenses', async (req, res) => {
  try {
    const newExpense = new Expense(req.body);
    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cleaner Schema
const cleanerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  salary: Number,
  department: String,
  dateOfJoining: { type: Date, default: Date.now },
  shiftTime: String,
  loginID: { type: String, unique: true, uppercase: true },
});

// Pre-save hook to generate loginID
cleanerSchema.pre('save', function (next) {
  if (!this.loginID) {
    // Generate loginID if not provided
    const uniqueID = Math.random().toString(36).substr(2, 6).toUpperCase(); // Change length as needed
    this.loginID = uniqueID;
  }
  next();
});

const Cleaner = mongoose.model('Cleaner', cleanerSchema);


// Cleaner Routes
app.get('/cleaners', async (req, res) => {
  try {
    const cleaners = await Cleaner.find();
    res.json(cleaners);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/cleaners', async (req, res) => {
  try {
    const newCleaner = new Cleaner(req.body);
    const savedCleaner = await newCleaner.save();
    res.status(201).json(savedCleaner);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/cleaners/:loginID', async (req, res) => {
  try {
    const cleaner = await Cleaner.findOne({ loginID: req.params.loginID });
    if (!cleaner) {
      return res.status(404).json({ error: 'Cleaner not found' });
    }
    res.json(cleaner);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/cleaners/:id', async (req, res) => {
  try {
    const { name, salary, department, dateOfJoining, shiftTime, loginID } = req.body;

    // Find the cleaner by ID and update its details
    const updatedCleaner = await Cleaner.findByIdAndUpdate(req.params.id, {
      name,
      salary,
      department,
      dateOfJoining,
      shiftTime,
      loginID
    }, { new: true });

    if (!updatedCleaner) {
      return res.status(404).json({ error: 'Cleaner not found' });
    }

    res.json(updatedCleaner); // Return the updated cleaner object
  } catch (error) {
    console.error('Error updating cleaner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/cleaners/:id', async (req, res) => {
  try {
    // Find the cleaner by ID and delete it
    const deletedCleaner = await Cleaner.findByIdAndDelete(req.params.id);

    if (!deletedCleaner) {
      return res.status(404).json({ error: 'Cleaner not found' });
    }

    res.json({ message: 'Cleaner deleted successfully' });
  } catch (error) {
    console.error('Error deleting cleaner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get("/teachers-loginID", async (req, res) => {
  try {
    // Retrieve all teacher records from the database
    const teachers = await Teacher.find();

    // Extract loginID and name values from the array of teachers
    const teacherDetails = teachers.map(teacher => ({
      loginID: teacher.loginID,
      name: teacher.name // Assuming 'name' is a property in your Teacher model
    }));

    // Send the list of loginIDs and names as a JSON response
    res.status(200).json(teacherDetails);
  } catch (error) {
    // Handle any errors that occur during the database query
    res.status(500).json({ error: "Could not fetch teachers" });
  }
});

app.get("/student-attendence-chart/:loginID", async (req, res) => {
  try {
    // Retrieve the loginID from the route parameters
    const { loginID } = req.params;

    // Fetch the teacher's data from MongoDB based on the provided loginID
    const teacher = await Student.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Count the number of present and absent entries for the teacher
    const presentCount = teacher.presentDates.length;
    const absentCount = teacher.absentDates.length;

    // Generate the chart as HTML
    const chartHtml = `
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
          <canvas id="statusChart" width="400" height="200"></canvas>
          <script>
            const ctx = document.getElementById('statusChart').getContext('2d');
            const chartConfig = {
              type: 'pie',
              data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                  data: [${presentCount}, ${absentCount}],
                  backgroundColor: ['green', 'red'],
                }],
              },
            };
            new Chart(ctx, chartConfig);
          </script>
        </body>
      </html>
    `;

    // Set the content type to HTML and send the chart as an HTML response
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(chartHtml);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate chart" });
  }
});

app.get("/emergency-call/:class/:section", async (req, res) => {
  try {
    const className = req.params.class;
    const section = req.params.section;
    const students = await Student.find({ class: className, section });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ message: "No students found in this class and section" });
    }

    // Extract loginID and name of each student
    const studentData = students.map((student) => ({
      loginID: student.loginID,
      name: student.name,
      class: `${className}-${section}`,
      fathersName: student.fatherName,
      mobile: student.appRegNumber,
    }));

    res.status(200).json(studentData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});


app.get("/get-lesson-plans/:loginID", async (req, res) => {
  try {
    const { loginID } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Retrieve the lesson plans for the teacher
    const lessonPlans = teacher.lessonPlans;

    res.status(200).json({ lessonPlans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve lesson plans" });
  }
});


app.delete("/delete-lesson-plan/:loginID/:lessonPlanID", async (req, res) => {
  try {
    const { loginID, lessonPlanID } = req.params;

    // Find the teacher by loginID
    const teacher = await Teacher.findOne({ loginID });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Find the index of the lesson plan in the teacher's lessonPlans array
    const lessonPlanIndex = teacher.lessonPlans.findIndex(
      (lp) => lp._id.toString() === lessonPlanID
    );

    // Check if the lesson plan exists
    if (lessonPlanIndex === -1) {
      return res.status(404).json({ error: "Lesson plan not found" });
    }

    // Remove the lesson plan from the teacher's lessonPlans array
    teacher.lessonPlans.splice(lessonPlanIndex, 1);

    // Save the updated teacher document
    await teacher.save();

    res.status(200).json({ message: "Lesson plan deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete lesson plan" });
  }
});


const subjectSchema = new mongoose.Schema({
  class: String,
  subjects: [String]
});

const Subject = mongoose.model('Subject', subjectSchema);

// Endpoint to get subjects based on class
app.get('/all-subjects/:class', async (req, res) => {
  const requestedClass = req.params.class;

  try {
    // Find the class in the MongoDB collection
    const classData = await Subject.findOne({ class: requestedClass });

    if (!classData) {
      return res.status(404).json({ error: 'Class not found', class: requestedClass });
    }

    // Send the list of subjects for the requested class
    res.json({ subjects: classData.subjects });
  } catch (error) {
    console.error(error);
    res.send(error);
    // res.status(500).json({ error: 'Internal server error' });
  }
});

// ===============================================

const tokenSchema = new mongoose.Schema({
  token: String,
  loginID: String,
  name: String
});

const Firebase = mongoose.model('Firebase-Notify', tokenSchema);
app.post("/add-firebase-token", async (req, res) => {
  try {
    const newToken = new Firebase(req.body);
    const savedToken = await newToken.save();
    res.status(200).json(savedToken);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/get-firebase-token', async (req, res) => {
  try {
    const latestTokens = await Firebase.aggregate([
      {
        $sort: { _id: -1 } // Sort in descending order based on _id (which includes a timestamp)
      },
      {
        $group: {
          _id: "$loginID",
          latestToken: { $first: "$$ROOT" } // Get the latest document for each loginID
        }
      },
      {
        $replaceRoot: { newRoot: "$latestToken" } // Replace the root with the latest document
      }
    ]);

    res.json(latestTokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/delete-firebase-token/:token', async (req, res) => {
  try {
    const tokenToDelete = req.params.token;

    // Assuming your model is named Firebase
    const deletedToken = await Firebase.deleteMany({ token: tokenToDelete });

    if (deletedToken) {
      res.json({ message: 'Token deleted successfully', deletedToken });
    } else {
      res.status(404).json({ error: 'Token not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================================

const Notification = new mongoose.Schema({
  title: String,
  body: String,
});
const notification = mongoose.model('Firebase-notification', Notification);

app.post("/add-firebase-notify", async (req, res) => {
  try {
    const newNotification = new notification(req.body);
    const savedNotification = await newNotification.save();
    res.status(200).json(savedNotification);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/get-firebase-notify', async (req, res) => {
  try {
    const notifications = await notification.find();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================================

const announcementSchema = new mongoose.Schema({
  date: String,
  reason: String,
  class: String, // Add class field to the announcement schema
  section: String, // Add section field to the announcement schema
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
app.post("/create-announcement/:class/:section", async (req, res) => {
  try {
    const { class: className, section } = req.params;
    const { reason, date } = req.body;

    const eventData = {
      reason: reason,
      date: date,
      class: className, // Include class information
      section: section, // Include section information
    };

    // Create the announcement
    const announcement = new Announcement(eventData);
    await announcement.save();

    // Find students in the specified class and section
    const students = await Student.find({ class: className, section: section });

    if (students.length === 0) {
      return res
        .status(204)
        .json({ message: "No students found in this class and section" });
    }

    res
      .status(200)
      .json({ message: "Announcement created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create announcements" });
  }
});
app.get("/get-announcements/:loginID", async (req, res) => {
  try {
    const loginID = req.params.loginID;

    // Find the student based on the login ID
    const student = await Student.findOne({ loginID: loginID });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Retrieve announcements for the student's class and section
    const announcements = await Announcement.find({ class: student.class, section: student.section });

    res.status(200).json({ announcements: announcements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});
app.get("/get-all-announcements", async (req, res) => {
  try {
    // Retrieve all announcements
    const announcements = await Announcement.find();

    res.status(200).json({ announcements: announcements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});
app.delete("/delete-announcement/:announcementID", async (req, res) => {
  try {
    const announcementID = req.params.announcementID;

    // Check if the announcement exists
    const announcement = await Announcement.findById(announcementID);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Delete the announcement
    await Announcement.findByIdAndDelete(announcementID);

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ==============================================

app.get('/attendance-screen/:className/:section/:date', async (req, res) => {
  try {
    const { className, section, date } = req.params;

    // Validate the input parameters
    if (!className || !section || !date) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    // Find all students in the given class and section
    const students = await Student.find({ class: className, section: section });

    // Prepare an array to store attendance information
    const attendanceHistory = [];

    // Loop through each student and check their attendance on the specified date
    students.forEach(student => {
      const present = student.presentDates.includes(date);
      const absent = student.absentDates.includes(date);

      attendanceHistory.push({
        studentID: student.loginID,
        name: student.name,
        present,
        absent,
      });
    });

    res.status(200).json(attendanceHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==============================================

const lunchMenuSchema = new mongoose.Schema({
  day: { type: String, required: true },
  name: { type: String, required: true },
  time: String,
  menu: { type: String, required: true },
});
const LunchMenu = mongoose.model('LunchMenu', lunchMenuSchema);

// Route to add a new menu item
app.post('/menu', async (req, res) => {
  try {
    const { day, name, time, menu } = req.body;

    const newMenu = new LunchMenu({
      day,
      name,
      time,
      menu,
    });

    const savedMenu = await newMenu.save();
    // res.json(savedMenu);
    res.status(200).json({ message: "Menu Saved Successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get menu for a specific day
app.get('/menu/:day', async (req, res) => {
  try {
    const day = req.params.day;
    const menu = await LunchMenu.findOne({ day });

    if (!menu) {
      return res.status(404).json({ message: 'Menu not found for the specified day' });
    }

    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/editMenu', async (req, res) => {
  const {
    day,
    name,
    time,
    menu,
  } = req.body;

  try {
    const dayE = await LunchMenu.findOneAndUpdate({ day }, { day, name, time, menu }, { new: true, runValidators: true });

    if (!dayE) {
      return res.status(404).json({ message: 'Day not found' });
    }

    res.status(200).json({ message: "Updatted Successfully", day, name, time, menu });
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: err });
  }
});

// ==============================================

const stuTokenSchema = new mongoose.Schema({
  token: String,
  loginID: String,
  name: String,
  class: String,
  section: String
});
const FirebaseStudent = mongoose.model('Firebase-Student', stuTokenSchema);

app.post("/add-firebase-tokenstu", async (req, res) => {
  try {
    const newToken = new FirebaseStudent(req.body);
    const savedToken = await newToken.save();
    res.status(200).json(savedToken);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/get-firebase-tokenstu/:class/:section', async (req, res) => {
  try {
    const { class: classParam, section } = req.params;

    if (!classParam || !section) {
      return res.status(400).json({ error: 'Class and section parameters are required' });
    }

    // Parse classParam to ensure it is a number
    const studentClass = classParam;

    const latestTokens = await FirebaseStudent.aggregate([
      {
        $match: {
          class: studentClass,
          section: section
        }
      },
      {
        $sort: { _id: -1 }
      },
      {
        $group: {
          _id: "$loginID",
          latestToken: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latestToken" }
      }
    ]);

    res.json(latestTokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/getsingle-firebase-tokenstu/:login', async (req, res) => {
  try {
    const { login } = req.params;

    if (!login) {
      return res.status(400).json({ error: 'Login ID is required' });
    }

    const latestTokens = await FirebaseStudent.aggregate([
      {
        $match: {
          loginID: login
        }
      },
      {
        $sort: { _id: -1 }
      },
      {
        $group: {
          _id: "$loginID",
          latestToken: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latestToken" }
      }
    ]);

    res.json(latestTokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.delete('/delete-firebase-tokenstu/:token', async (req, res) => {
  try {
    const tokenToDelete = req.params.token;

    // Assuming your model is named Firebase
    const deletedToken = await FirebaseStudent.deleteMany({ token: tokenToDelete });

    if (deletedToken) {
      res.json({ message: 'Token deleted successfully', deletedToken });
    } else {
      res.status(404).json({ error: 'Token not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a new route to get all Firebase tokens for all students
app.get('/get-all-firebase-tokens', async (req, res) => {
  try {
    const allTokens = await FirebaseStudent.aggregate([
      {
        $sort: { _id: -1 }
      },
      {
        $group: {
          _id: "$loginID",
          latestToken: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latestToken" }
      }
    ]);

    res.json(allTokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ===============================================

const stuNotification = new mongoose.Schema({
  title: String,
  body: String,
  date: String,
});
const notificationStu = mongoose.model('Firebase-notification-stu', stuNotification);

app.post("/add-firebase-notifystu", async (req, res) => {
  try {
    const newNotification = new notificationStu(req.body);
    const savedNotification = await newNotification.save();
    res.status(200).json(savedNotification);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/get-firebase-notifystu', async (req, res) => {
  try {
    const notifications = await notificationStu.find();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================================

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
