import mongoose from 'mongoose';

const API = process.env.API_URL || 'http://localhost:5000/api';
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resumeiq';

const run = async () => {
  try {
    // 1) Register
    const email = `e2e_user_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'E2E Tester';

    console.log('Registering user', email);
    const regRes = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const regJson = await regRes.json();
    if (!regRes.ok) {
      console.error('Register failed', regRes.status, regJson);
      return process.exit(1);
    }
    const token = regJson.token;
    const userId = regJson._id;
    console.log('Registered, userId=', userId);

    // 2) Connect to Mongo and insert a Resume document
    console.log('Connecting to Mongo at', MONGO);
    await mongoose.connect(MONGO);
    const ResumeSchema = new mongoose.Schema({}, { strict: false });
    const Resume = mongoose.model('Resume_e2e', ResumeSchema, 'resumes');

    const resumeDoc = await Resume.create({
      userId: new mongoose.Types.ObjectId(userId),
      originalFileName: 'sample.pdf',
      fileUrl: '/uploads/sample.pdf',
      fileType: 'pdf',
      extractedText: 'Experienced backend developer with Node.js, Express, MongoDB, and cloud experience. Built APIs and integrated AI.'
    });

    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User_e2e', UserSchema, 'users');
    const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    if (!user) throw new Error('Created user not found in DB');
    if (!user.verificationToken) throw new Error('Verification token missing');

    console.log('Verifying user email...');
    const verifyRes = await fetch(`${API}/auth/verify/${user.verificationToken}`);
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok) {
      console.error('Email verification failed', verifyRes.status, verifyJson);
      return process.exit(1);
    }
    console.log('Email verified:', verifyJson.message);

    console.log('Inserted resume', resumeDoc._id);

    // 3) Call analysis API
    const jobTitle = 'Backend Developer';
    const jobDescription = 'Looking for Node.js, Express, MongoDB experience. Knowledge of cloud and REST APIs is required.';

    console.log('Calling analysis endpoint...');
    const analysisRes = await fetch(`${API}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ resumeId: resumeDoc._id.toString(), jobTitle, jobDescription })
    });
    const analysisJson = await analysisRes.json();
    if (!analysisRes.ok) {
      console.error('Analysis failed', analysisRes.status, analysisJson);
      return process.exit(1);
    }

    console.log('Analysis result:', JSON.stringify(analysisJson, null, 2));

    console.log('E2E test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('E2E test error', err);
    process.exit(1);
  }
};

run();
