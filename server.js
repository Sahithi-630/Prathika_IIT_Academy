const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    seedDatabase();
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// ==========================================
// SCHEMAS & MODELS
// ==========================================

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  class: { type: String },
  role: { type: String, required: true, enum: ['student', 'admin'] }
});
const User = mongoose.model('User', userSchema);

const inquirySchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  parentName: { type: String },
  studentClass: { type: String, required: true },
  targetExam: { type: String },
  phoneNumber: { type: String, required: true },
  message: { type: String },
  date: { type: String, required: true },
  status: { type: String, required: true, default: 'Pending', enum: ['Pending', 'Contacted', 'Enrolled'] }
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

const mockTestSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  dateTime: { type: String, required: true },
  syllabus: { type: String, required: true }
});
const MockTest = mongoose.model('MockTest', mockTestSchema);

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  tag: { type: String, required: true },
  date: { type: String, required: true }
});
const Announcement = mongoose.model('Announcement', announcementSchema);

const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  url: { type: String, required: true }
});
const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);

const doubtSchema = new mongoose.Schema({
  studentUsername: { type: String, required: true },
  studentName: { type: String, required: true },
  subject: { type: String, required: true },
  question: { type: String, required: true },
  status: { type: String, required: true, default: 'Pending', enum: ['Pending', 'Solved'] },
  reply: { type: String, default: '' }
});
const Doubt = mongoose.model('Doubt', doubtSchema);

// ==========================================
// DATABASE SEEDER
// ==========================================
async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database empty. Seeding initial data...');

      // Seed Users
      const defaultUsers = [
        { username: 'student', password: 'student123', fullName: 'Sandeep Goud', class: 'Intermediate 2nd Year', role: 'student' },
        { username: 'admin', password: 'admin123', fullName: 'Sirisha Teacher', role: 'admin' }
      ];
      await User.insertMany(defaultUsers);
      console.log('Seeded users.');

      // Seed Mock Tests
      const defaultTests = [
        {
          subject: 'Chemistry',
          dateTime: '2026-07-19T10:00',
          syllabus: 'Organic Carbon Compounds & Nomenclature basics (Class 9 Core)'
        },
        {
          subject: 'Mathematics',
          dateTime: '2026-07-22T14:00',
          syllabus: 'Quadratic Equations & Roots derivation formula mock practice'
        },
        {
          subject: 'Physics',
          dateTime: '2026-07-26T09:30',
          syllabus: 'Newton Laws of Motion, Friction coefficient exercises & Free Body diagrams'
        }
      ];
      await MockTest.insertMany(defaultTests);
      console.log('Seeded mock tests.');

      // Seed Announcements
      const defaultAnnouncements = [
        {
          title: 'New Offline Batch Timings',
          content: 'Dear students and parents, please note that offline tutoring timings have been adjusted to 4:30 PM - 7:30 PM (Monday to Saturday) to ensure maximum daylight focus. Please arrive 10 minutes early.',
          tag: 'Important',
          date: '10 Jul 2026'
        },
        {
          title: 'Chemistry Printed Study Handouts',
          content: 'Kindly bring your organic chemistry printed notebooks tomorrow. Sirisha Teacher will lead a dedicated problem-solving session on Alkynes nomenclature rules.',
          tag: 'General',
          date: '12 Jul 2026'
        }
      ];
      await Announcement.insertMany(defaultAnnouncements);
      console.log('Seeded announcements.');

      // Seed Study Materials
      const defaultStudy = [
        {
          title: 'Trigonometric Identities Cheat Sheet',
          subject: 'Mathematics',
          url: 'https://drive.google.com/drive/folders/demo1'
        },
        {
          title: 'Periodic Table Trends Summary Note',
          subject: 'Chemistry',
          url: 'https://drive.google.com/drive/folders/demo2'
        },
        {
          title: 'Solenoids & Magnetic Fields Handout',
          subject: 'Physics',
          url: 'https://drive.google.com/drive/folders/demo3'
        }
      ];
      await StudyMaterial.insertMany(defaultStudy);
      console.log('Seeded study materials.');

      // Seed Doubts
      const defaultDoubts = [
        {
          studentUsername: 'student',
          studentName: 'Sandeep Goud',
          subject: 'Chemistry',
          question: 'Why does Nitrogen have a higher ionization potential than Oxygen even though Oxygen has a higher atomic number?',
          status: 'Solved',
          reply: 'This is due to the half-filled p-orbital stability of Nitrogen (1s² 2s² 2p³). Half-filled subshells are extra stable due to symmetrical distribution and exchange energy. Oxygen (2p⁴) easily loses its fourth electron to achieve a stable half-filled configuration.'
        },
        {
          studentUsername: 'student',
          studentName: 'Sandeep Goud',
          subject: 'Mathematics',
          question: 'How do I identify if the roots of a quadratic equation are imaginary without graphing?',
          status: 'Pending',
          reply: ''
        }
      ];
      await Doubt.insertMany(defaultDoubts);
      console.log('Seeded doubts.');

      // Seed Inquiries
      const defaultInquiries = [
        {
          studentName: 'Karthik Rao',
          parentName: 'Ramanadha Rao',
          studentClass: 'Class 9',
          targetExam: 'IIT Foundation',
          phoneNumber: '6301884617',
          message: 'Looking for a chemistry batch starting next week. Needs conceptual help in formulas.',
          date: 'Jul 10, 2026',
          status: 'Pending'
        },
        {
          studentName: 'Praneetha Reddy',
          parentName: 'Kavitha Reddy',
          studentClass: 'Class 7',
          targetExam: 'IIT Foundation',
          phoneNumber: '9618955830',
          message: 'Wants to enroll for Mathematics foundation classes early. Kindly call back.',
          date: 'Jul 12, 2026',
          status: 'Contacted'
        }
      ];
      await Inquiry.insertMany(defaultInquiries);
      console.log('Seeded inquiries.');
      console.log('Database seeding completed successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid Username or Password' });
    }
    res.json({
      username: user.username,
      fullName: user.fullName,
      class: user.class,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, fullName, class: studentClass } = req.body;
    if (!username || !password || !fullName || !studentClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username}" is already taken` });
    }
    const newUser = new User({
      username,
      password,
      fullName,
      class: studentClass,
      role: 'student'
    });
    await newUser.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// 2. Inquiries
app.get('/api/inquiries', async (req, res) => {
  try {
    const inquiries = await Inquiry.find({});
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving inquiries' });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const { studentName, parentName, studentClass, targetExam, phoneNumber, message, date } = req.body;
    if (!studentName || !studentClass || !phoneNumber) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    const newInquiry = new Inquiry({
      studentName,
      parentName,
      studentClass,
      targetExam,
      phoneNumber,
      message,
      date: date || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
      status: 'Pending'
    });
    const saved = await newInquiry.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating inquiry' });
  }
});

app.put('/api/inquiries/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating inquiry status' });
  }
});

app.delete('/api/inquiries/:id', async (req, res) => {
  try {
    const deleted = await Inquiry.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting inquiry' });
  }
});

// 3. Mock Tests
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await MockTest.find({});
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving tests' });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const { subject, dateTime, syllabus } = req.body;
    if (!subject || !dateTime || !syllabus) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newTest = new MockTest({ subject, dateTime, syllabus });
    const saved = await newTest.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error scheduling mock test' });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    const deleted = await MockTest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Mock test not found' });
    }
    res.json({ message: 'Mock test deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting mock test' });
  }
});

// 4. Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({});
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving announcements' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, tag } = req.body;
    if (!title || !content || !tag) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newAnn = new Announcement({
      title,
      content,
      tag,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    });
    const saved = await newAnn.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error posting announcement' });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting announcement' });
  }
});

// 5. Study Materials
app.get('/api/study', async (req, res) => {
  try {
    const study = await StudyMaterial.find({});
    res.json(study);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving study materials' });
  }
});

app.post('/api/study', async (req, res) => {
  try {
    const { title, subject, url } = req.body;
    if (!title || !subject || !url) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newStudy = new StudyMaterial({ title, subject, url });
    const saved = await newStudy.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error adding study material' });
  }
});

app.delete('/api/study/:id', async (req, res) => {
  try {
    const deleted = await StudyMaterial.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Study material not found' });
    }
    res.json({ message: 'Study material deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting study material' });
  }
});

// 6. Doubts
app.get('/api/doubts', async (req, res) => {
  try {
    const { studentUsername } = req.query;
    let filter = {};
    if (studentUsername) {
      filter.studentUsername = studentUsername.toLowerCase();
    }
    const doubts = await Doubt.find(filter);
    res.json(doubts);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving doubts' });
  }
});

app.post('/api/doubts', async (req, res) => {
  try {
    const { studentUsername, studentName, subject, question } = req.body;
    if (!studentUsername || !studentName || !subject || !question) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newDoubt = new Doubt({
      studentUsername: studentUsername.toLowerCase(),
      studentName,
      subject,
      question,
      status: 'Pending',
      reply: ''
    });
    const saved = await newDoubt.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating doubt ticket' });
  }
});

app.put('/api/doubts/:id', async (req, res) => {
  try {
    const { reply } = req.body;
    if (reply === undefined) {
      return res.status(400).json({ error: 'Reply content is required' });
    }
    const updated = await Doubt.findByIdAndUpdate(
      req.params.id,
      { reply, status: 'Solved' },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Doubt ticket not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating doubt reply' });
  }
});

// ==========================================
// SERVE STATIC FRONTEND FILES
// ==========================================
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for undefined frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
