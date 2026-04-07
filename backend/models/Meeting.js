const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    meeting_name: {
        type: String,
        required: [true, 'Meeting name is required'],
        trim: true
    },
    meeting_date_time: {
        type: Date,
        required: true
    },
    meeting_host: {
        type: String,
        required: [true, 'Meeting host is required'],
        trim: true
    },
    student_role: {
        type: String,
        required: [true, 'Student role is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'done', 'canceled'],
        default: 'scheduled'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Meeting', MeetingSchema);