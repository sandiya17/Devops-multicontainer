// server/models/Report.js
const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

// Function to generate unique 6-character alias
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// Schema for individual chat messages
const MessageSchema = new mongoose.Schema({
    sender: { 
        type: String, 
        enum: ['User', 'Admin'],
        required: true 
    },
    messageText: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    // **NEW:** Flag for user-sent emergency messages
    isEmergency: { type: Boolean, default: false } 
});

// Main Report Schema
const ReportSchema = new mongoose.Schema({
    // Core Anonymous Identifier
    alias: { 
        type: String, 
        required: true, 
        unique: true,
        default: () => `SPK-${nanoid()}`
    }, 
    
    // **UPDATED:** Incident Details (Supports Text or Voice Transcript)
    category: { type: String, required: true },
    description: { type: String, required: true },
    voiceTranscript: { type: String, default: '' }, // New field for voice data
    incidentDate: { type: Date, required: true },
    location: { type: String },
    
    // **NEW:** Optional Reporter Identity fields
    reporterName: { type: String },
    contactEmail: { type: String },

    // Case Management
    status: { 
        type: String, 
        enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
        default: 'Open' 
    },
    
    // **NEW:** Admin Assignment fields (for SMS simulation feature)
    assignedToPhone: { type: String, default: '' },
    assignedToName: { type: String, default: '' },

    // Communication
    messages: [MessageSchema], 
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);