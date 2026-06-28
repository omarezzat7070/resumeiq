import crypto from 'crypto';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { sendEmail } from '../utils/mailer.js';

// POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      emailVerified: false
    });

    // send verification email
    try {
      const verifyUrl = `${process.env.BACKEND_URL || ''}/api/auth/verify/${verificationToken}`;
      const html = `<p>Hi ${user.name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>`;
      await sendEmail({ to: user.email, subject: 'Verify your ResumeIQ account', html });
    } catch (err) {
      console.error('Failed to send verification email', err.message);
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/verify/:token
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification token' });

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    try {
      const verifyUrl = `${process.env.BACKEND_URL || ''}/api/auth/verify/${verificationToken}`;
      const html = `<p>Hi ${user.name},</p>
        <p>Please verify your email by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>`;
      await sendEmail({ to: user.email, subject: 'Verify your ResumeIQ account', html });
    } catch (err) {
      console.error('Failed to send verification email', err.message);
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};
