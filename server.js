const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  role: { type: String, required: true, enum: ['student', 'admin'] },
  studyMode: { type: String, default: 'Offline' },
  batchTimings: { type: String, default: 'Mon to Sat | 4:30 PM - 7:30 PM' },
  campusLocation: { type: String, default: 'Alwal Campus, Secunderabad' }
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
  syllabus: { type: String, required: true },
  class: { type: String, required: true, default: 'All Classes' }
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
  url: { type: String, required: true },
  class: { type: String, required: true, default: 'All Classes' }
});
const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);

const meetLinkSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  dateTime: { type: String, required: true },
  url: { type: String, required: true },
  class: { type: String, required: true }
});
const MeetLink = mongoose.model('MeetLink', meetLinkSchema);

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
      console.log('Database empty. Seeding admin account...');

      // Seed only the primary admin user
      const defaultUsers = [
        { username: 'admin', password: 'admin123', fullName: 'Sirisha Teacher', role: 'admin' }
      ];
      await User.insertMany(defaultUsers);
      console.log('Seeded admin account.');
      console.log('Database seeding completed successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// Helper function to decode JWT payload without signature verification (Developer Fallback)
function decodeJwtWithoutVerification(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

// Google Auth Endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'ID Token is required' });
    }

    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (clientId) {
      // Enforce secure verification if GOOGLE_CLIENT_ID is set
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: clientId,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.error('Error verifying Google Token:', verifyErr);
        return res.status(401).json({ error: 'Invalid Google Token signature' });
      }
    } else {
      // Fallback for development/testing when Client ID is not configured in .env
      console.warn('[WARNING] GOOGLE_CLIENT_ID is not set in .env. Skipping token signature verification (Dev Mode).');
      payload = decodeJwtWithoutVerification(idToken);
      if (!payload) {
        return res.status(400).json({ error: 'Failed to parse Google ID Token' });
      }
    }

    // Extract user info
    const { email, name, sub } = payload;
    if (!email) {
      return res.status(400).json({ error: 'Email not found in Google Token payload' });
    }

    // Check if user exists in db
    let user = await User.findOne({ username: email.toLowerCase() });

    if (!user) {
      return res.status(403).json({ error: 'This email is not registered as a student account. Please contact the academy team to activate your account.' });
    }

    // Log in
    res.json({
      username: user.username,
      fullName: user.fullName,
      class: user.class,
      role: user.role,
      studyMode: user.studyMode,
      batchTimings: user.batchTimings,
      campusLocation: user.campusLocation
    });

  } catch (error) {
    console.error('Error in /api/auth/google:', error);
    res.status(500).json({ error: 'Google login failed due to a server error' });
  }
});

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
      role: user.role,
      studyMode: user.studyMode,
      batchTimings: user.batchTimings,
      campusLocation: user.campusLocation
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
    const { class: studentClass } = req.query;
    let filter = {};
    if (studentClass) {
      filter.$or = [
        { class: { $in: [studentClass, 'All Classes'] } },
        { class: { $exists: false } },
        { class: null }
      ];
    }
    const tests = await MockTest.find(filter);
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving tests' });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const { subject, dateTime, syllabus, class: targetClass } = req.body;
    if (!subject || !dateTime || !syllabus || !targetClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newTest = new MockTest({ subject, dateTime, syllabus, class: targetClass });
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
    const { class: studentClass } = req.query;
    let filter = {};
    if (studentClass) {
      filter.$or = [
        { class: { $in: [studentClass, 'All Classes'] } },
        { class: { $exists: false } },
        { class: null }
      ];
    }
    const study = await StudyMaterial.find(filter);
    res.json(study);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving study materials' });
  }
});

app.post('/api/study', async (req, res) => {
  try {
    const { title, subject, url, class: targetClass } = req.body;
    if (!title || !subject || !url || !targetClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newStudy = new StudyMaterial({ title, subject, url, class: targetClass });
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
// 7. STUDENTS MANAGER (ADMIN ONLY)
// ==========================================
app.get('/api/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving students list' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { username, password, fullName, class: studentClass, studyMode, batchTimings, campusLocation } = req.body;
    if (!username || !password || !fullName || !studentClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username}" is already taken` });
    }
    const newStudent = new User({
      username: username.toLowerCase(),
      password,
      fullName,
      class: studentClass,
      role: 'student',
      studyMode: studyMode || 'Offline',
      batchTimings: batchTimings || 'Mon to Sat | 4:30 PM - 7:30 PM',
      campusLocation: campusLocation || 'Alwal Campus, Secunderabad'
    });
    const saved = await newStudent.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error creating student account' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { username, password, fullName, class: studentClass, studyMode, batchTimings, campusLocation } = req.body;
    if (!username || !password || !fullName || !studentClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(), 
      _id: { $ne: req.params.id } 
    });
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username}" is already taken` });
    }
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { 
        username: username.toLowerCase(), 
        password, 
        fullName, 
        class: studentClass,
        studyMode,
        batchTimings,
        campusLocation
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Student account not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating student account' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student account deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting student account' });
  }
});

// ==========================================
// 8. LIVE CLASSES (MEET LINKS)
// ==========================================
app.get('/api/meet-links', async (req, res) => {
  try {
    const { class: studentClass } = req.query;
    let filter = {};
    if (studentClass) {
      filter.$or = [
        { class: { $in: [studentClass, 'All Classes'] } },
        { class: { $exists: false } },
        { class: null }
      ];
    }
    const links = await MeetLink.find(filter);
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving live classes' });
  }
});

app.post('/api/meet-links', async (req, res) => {
  try {
    const { subject, dateTime, url, class: targetClass } = req.body;
    if (!subject || !dateTime || !url || !targetClass) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newLink = new MeetLink({ subject, dateTime, url, class: targetClass });
    const saved = await newLink.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Server error scheduling live class' });
  }
});

app.delete('/api/meet-links/:id', async (req, res) => {
  try {
    const deleted = await MeetLink.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Live class link not found' });
    }
    res.json({ message: 'Live class link deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting live class link' });
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

// Start Server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;

