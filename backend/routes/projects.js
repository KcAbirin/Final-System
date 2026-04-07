const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// @route   GET /api/projects
// @desc    Get all projects for logged in student
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const projects = await Project.find({ student_id: req.user.id })
            .sort({ deadline: 1 });
        
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/projects/:id
// @desc    Get single project with tasks
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            student_id: req.user.id
        });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        const tasks = await Task.find({ project_id: project._id });
        
        res.json({ project, tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { project_name, adviser, type_of_project, deadline, status, percentage_complete } = req.body;
        
        const project = await Project.create({
            student_id: req.user.id,
            project_name,
            adviser,
            type_of_project,
            deadline,
            status: status || 'not_started',
            percentage_complete: percentage_complete || 0
        });
        
        res.status(201).json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        let project = await Project.findOne({
            _id: req.params.id,
            student_id: req.user.id
        });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        project = await Project.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        
        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project and all associated tasks
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            student_id: req.user.id
        });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        // Delete all associated tasks
        await Task.deleteMany({ project_id: project._id });
        
        // Delete project
        await project.deleteOne();
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/projects/:projectId/tasks
// @desc    Create task for project
// @access  Private
router.post('/:projectId/tasks', auth, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            student_id: req.user.id
        });
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        const task = await Task.create({
            project_id: project._id,
            task_name: req.body.task_name,
            due_date: req.body.due_date,
            status: req.body.status || 'not_started'
        });
        
        res.status(201).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/projects/tasks/:taskId
// @desc    Update task
// @access  Private
router.put('/tasks/:taskId', auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        // Verify task belongs to user's project
        const project = await Project.findOne({
            _id: task.project_id,
            student_id: req.user.id
        });
        
        if (!project) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.taskId,
            { $set: req.body },
            { new: true }
        );
        
        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;