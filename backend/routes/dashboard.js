const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const auth = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    Get dashboard statistics and data
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Get total projects
        const totalProjects = await Project.countDocuments({ student_id: req.user.id });
        
        // SECURITY FIX: Find all projects belonging to the logged-in user first
        // This ensures users only see their own tasks
        const userProjects = await Project.find({ student_id: req.user.id }).select('_id');
        const userProjectIds = userProjects.map(p => p._id);

        // Get ongoing tasks (not done) - Filtered by user's projects
        const ongoingTasks = await Task.countDocuments({
            project_id: { $in: userProjectIds },
            status: { $in: ['not_started', 'in_progress'] }
        });
        
        // Get upcoming meetings (scheduled and future)
        const upcomingMeetings = await Meeting.countDocuments({
            student_id: req.user.id,
            status: 'scheduled',
            meeting_date_time: { $gte: new Date() }
        });
        
        // FIX: Get tasks (Changed from strictly today/tomorrow to ALL upcoming/ongoing tasks)
        const tasks = await Task.find({
            project_id: { $in: userProjectIds }, // Only their tasks
            status: { $in: ['not_started', 'in_progress'] } // Ignore finished ones
        })
        .populate('project_id', 'project_name')
        .sort({ due_date: 1 }) // Sort by closest deadline
        .limit(5); // Show top 5
        
        // Get recent meetings
        const recentMeetings = await Meeting.find({
            student_id: req.user.id,
            status: 'scheduled',
            meeting_date_time: { $gte: new Date() }
        })
        .sort({ meeting_date_time: 1 })
        .limit(5);
        
        // NEW FIX: Get recent projects for the Dashboard Project Overview
        const recentProjects = await Project.find({ student_id: req.user.id })
        .sort({ createdAt: -1 }) // Newest first
        .limit(5);
        
        // Get project statistics for chart
        // Note: mongoose aggregate needs exact ObjectId casting sometimes.
        const projectStats = await Project.aggregate([
            { $match: { student_id: req.user._id || req.user.id } }, 
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);
        
        // Send everything to the frontend!
        res.json({
            stats: {
                total_projects: totalProjects,
                ongoing_tasks: ongoingTasks,
                upcoming_meetings: upcomingMeetings
            },
            tasks: tasks,
            recent_meetings: recentMeetings,
            project_stats: projectStats,
            recent_projects: recentProjects // Added this so your frontend table works!
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;