const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    project_name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true
    },
    adviser: {
        type: String,
        required: [true, 'Adviser name is required'],
        trim: true
    },
    type_of_project: {
        type: String,
        required: true,
        trim: true
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'finished'],
        default: 'not_started'
    },
    percentage_complete: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
