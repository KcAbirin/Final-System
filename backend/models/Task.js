const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    task_name: {
        type: String,
        required: [true, 'Task name is required'],
        trim: true
    },
    due_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'done'],
        default: 'not_started'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', TaskSchema);