const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new student
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { student_id, first_name, last_name, email, password, course } = req.body;
        
        // Check if student exists
        const studentExists = await Student.findOne({ 
            $or: [{ student_id }, { email }] 
        });
        
        if (studentExists) {
            return res.status(400).json({ 
                message: studentExists.student_id === student_id ? 
                    'Student ID already exists' : 'Email already exists' 
            });
        }
        
        // Create student
        const student = await Student.create({
            student_id,
            first_name,
            last_name,
            email,
            password_hash: password,
            course
        });
        
        res.status(201).json({
            message: 'Student created successfully',
            student: {
                id: student._id,
                student_id: student.student_id,
                full_name: `${student.first_name} ${student.last_name}`,
                email: student.email,
                course: student.course
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login student
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { student_id, password } = req.body;
        
        // Find student by student_id
        const student = await Student.findOne({ student_id });
        
        if (!student) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await student.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: student._id, student_id: student.student_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
        
        res.json({
            token,
            student: {
                id: student._id,
                student_id: student.student_id,
                full_name: student.full_name,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                course: student.course
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        
        // Find student by student_id or email
        const student = await Student.findOne({
            $or: [{ student_id: identifier }, { email: identifier }]
        });
        
        if (!student) {
            // For security, still return success even if user not found
            return res.json({ message: 'If an account exists, reset instructions will be sent' });
        }
        
        // Generate reset token
        const resetToken = jwt.sign(
            { id: student._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        // Save reset token to database
        student.reset_password_token = resetToken;
        student.reset_password_expires = Date.now() + 3600000; // 1 hour
        await student.save();
        
        // In production, send email with reset link
        // For now, just return success
        console.log(`Reset token for ${student.email}: ${resetToken}`);
        
        res.json({ message: 'If an account exists, reset instructions will be sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        // Find student with valid reset token
        const student = await Student.findOne({
            _id: decoded.id,
            reset_password_token: token,
            reset_password_expires: { $gt: Date.now() }
        });
        
        if (!student) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        // Update password
        student.password_hash = new_password;
        student.reset_password_token = null;
        student.reset_password_expires = null;
        await student.save();
        
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update student profile (name and course only)
// @access  Private
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { first_name, last_name, course } = req.body;
        
        // Validate inputs
        if (!first_name || !last_name || !course) {
            return res.status(400).json({ 
                message: 'First name, last name, and course are required' 
            });
        }
        
        // Find student and update
        const student = await Student.findById(req.user.id);
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Update only name and course (not student_id or email)
        student.first_name = first_name.trim();
        student.last_name = last_name.trim();
        student.course = course.trim();
        
        await student.save();
        
        res.json({
            message: 'Profile updated successfully',
            student: {
                id: student._id,
                student_id: student.student_id,
                full_name: student.full_name,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                course: student.course
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/auth/account
// @desc    Delete student account and all associated data
// @access  Private
router.delete('/account', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        
        // Validate password is provided
        if (!password) {
            return res.status(400).json({ 
                message: 'Password is required to delete account' 
            });
        }
        
        // Find student and verify password
        const student = await Student.findById(req.user.id);
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Verify password before deletion
        const isPasswordValid = await bcrypt.compare(password, student.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password' });
        }
        
        // Import models for deletion
        const Meeting = require('../models/Meeting');
        const Project = require('../models/Project');
        const Task = require('../models/Task');
        
        // Delete all associated data
        await Promise.all([
            Meeting.deleteMany({ createdBy: req.user.id }),
            Project.deleteMany({ createdBy: req.user.id }),
            Task.deleteMany({ createdBy: req.user.id })
        ]);
        
        // Delete the student account
        await Student.findByIdAndDelete(req.user.id);
        
        res.json({ 
            message: 'Account and all associated data deleted successfully' 
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;