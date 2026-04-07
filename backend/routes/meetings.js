const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const auth = require('../middleware/auth');

// @route   GET /api/meetings
// @desc    Get all meetings for logged in student
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, sort } = req.query;
        
        let query = { student_id: req.user.id };
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        let meetingsQuery = Meeting.find(query);
        
        // Sort
        if (sort === 'nearest') {
            meetingsQuery = meetingsQuery.sort({ meeting_date_time: 1 });
        } else if (sort === 'farthest') {
            meetingsQuery = meetingsQuery.sort({ meeting_date_time: -1 });
        } else {
            meetingsQuery = meetingsQuery.sort({ meeting_date_time: 1 });
        }
        
        const meetings = await meetingsQuery;
        
        res.json(meetings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/meetings/upcoming
// @desc    Get upcoming meetings (for dashboard)
// @access  Private
router.get('/upcoming', auth, async (req, res) => {
    try {
        const meetings = await Meeting.find({
            student_id: req.user.id,
            status: 'scheduled',
            meeting_date_time: { $gte: new Date() }
        })
        .sort({ meeting_date_time: 1 })
        .limit(5);
        
        res.json(meetings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/meetings
// @desc    Create new meeting
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { meeting_name, meeting_date_time, meeting_host, student_role, status } = req.body;
        
        // Ensure meeting_date_time is properly parsed as a Date
        const parsedDate = new Date(meeting_date_time);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date/time format' });
        }
        
        const meeting = await Meeting.create({
            student_id: req.user.id,
            meeting_name,
            meeting_date_time: parsedDate,
            meeting_host,
            student_role,
            status: status || 'scheduled'
        });
        
        res.status(201).json(meeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/meetings/:id
// @desc    Update meeting
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        let meeting = await Meeting.findOne({
            _id: req.params.id,
            student_id: req.user.id
        });
        
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        
        // If updating the date/time, ensure it's properly parsed
        if (req.body.meeting_date_time) {
            const parsedDate = new Date(req.body.meeting_date_time);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: 'Invalid date/time format' });
            }
            req.body.meeting_date_time = parsedDate;
        }
        
        meeting = await Meeting.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        
        res.json(meeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/meetings/:id
// @desc    Cancel/Delete meeting
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const meeting = await Meeting.findOne({
            _id: req.params.id,
            student_id: req.user.id
        });
        
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        
        // Mark as canceled instead of hard delete
        meeting.status = 'canceled';
        await meeting.save();
        
        res.json({ message: 'Meeting canceled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;