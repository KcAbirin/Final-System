const express = require('express');
const router = express.Router();

// I noticed your Task model was inside your 'routes' folder earlier. 
// If it's still there, use this import:
const Task = require('../models/Task');
// (If you moved it to a 'models' folder, use: require('../models/Task') instead)

// ==========================================
// POST: Create a new Task
// ==========================================
router.post('/', async (req, res) => {
    try {
        const newTask = new Task({
            task_name: req.body.task_name,
            project_id: req.body.project_id,
            due_date: req.body.due_date,
            status: req.body.status || 'not_started'
        });
        
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Failed to create task", error: error.message });
    }
});

// ==========================================
// PUT: Update a Task (For Edit & Mark as Done)
// ==========================================
router.put('/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // This returns the updated document
        );
        
        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }
        
        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Failed to update task", error: error.message });
    }
});

// ==========================================
// GET: Fetch a single task (for the Edit form)
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });
        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch task", error: error.message });
    }
});

// ==========================================
// DELETE: Delete a task entirely
// ==========================================
router.delete('/:id', async (req, res) => {
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) return res.status(404).json({ message: "Task not found" });
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete task", error: error.message });
    }
});

module.exports = router;