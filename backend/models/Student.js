const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
    student_id: {
        type: String,
        required: [true, 'Student ID is required'],
        unique: true,
        trim: true
    },
    first_name: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    last_name: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password_hash: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    course: {
        type: String,
        required: [true, 'Course is required'],
        trim: true
    },
    reset_password_token: {
        type: String,
        default: null
    },
    reset_password_expires: {
        type: Date,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving
StudentSchema.pre('save', async function(next) {
    if (!this.isModified('password_hash')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
});

// Compare password method
StudentSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

// Virtual for full name
StudentSchema.virtual('full_name').get(function() {
    return `${this.first_name} ${this.last_name}`;
});

module.exports = mongoose.model('Student', StudentSchema);