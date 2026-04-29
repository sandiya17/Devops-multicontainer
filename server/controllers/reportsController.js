// server/controllers/reportsController.js
const Report = require('../models/Report');
const { customAlphabet } = require('nanoid');

// Set up nanoid based on the schema
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// Function to simulate sending an SMS (prints to console)
const simulateSms = (to, caseId, counselor) => {
    console.log("=========================================");
    console.log(`✅ SMS SIMULATION: Case Assigned!`);
    console.log(`TO: ${to}`);
    console.log(`MESSAGE: Case ${caseId} has been assigned to you, ${counselor}. Please review the dashboard immediately.`);
    console.log("=========================================");
};

// 1. Submit a new anonymous report
exports.submitReport = async (req, res) => {
    try {
        const { category, description, incidentDate, location, reporterName, contactEmail, voiceTranscript } = req.body;
        
        const newReport = new Report({
            category,
            description,
            incidentDate: new Date(incidentDate),
            location,
            reporterName, 
            contactEmail,
            voiceTranscript
        });

        await newReport.save();
        
        const io = req.app.get('socketio');
        io.to('admins').emit('newReport', newReport);

        res.status(201).json({ 
            message: 'Report submitted successfully. Your anonymous tracking ID is:',
            alias: newReport.alias 
        });

    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({ message: 'Internal server error during submission.' });
    }
};

// 2. Assign Case (NEW FEATURE)
exports.assignCase = async (req, res) => {
    try {
        const { assignedToPhone, assignedToName } = req.body;
        const report = await Report.findById(req.params.id);

        if (!report) return res.status(404).json({ message: 'Report not found.' });

        report.assignedToPhone = assignedToPhone;
        report.assignedToName = assignedToName;
        report.status = 'In Progress'; // Automatically set to In Progress upon assignment
        await report.save();

        simulateSms(assignedToPhone, report.alias, assignedToName);

        const io = req.app.get('socketio');
        io.to('admins').emit('reportUpdated', report);
        io.to(`report-${report.alias}`).emit('reportUpdated', report); // Notify user

        res.status(200).json({ message: 'Case assigned and SMS simulated.', report });

    } catch (error) {
        console.error('Error assigning case:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// 3. Update Status
exports.updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const report = await Report.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true }
        );
        if (!report) return res.status(404).json({ message: 'Report not found.' });
        
        const io = req.app.get('socketio');
        io.to('admins').emit('reportUpdated', report);
        io.to(`report-${report.alias}`).emit('reportUpdated', report); 

        res.status(200).json(report);

    } catch (error) {
        console.error('Error updating report status:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// 4. Post a new message (Handles isEmergency flag)
exports.postMessage = async (req, res) => {
    try {
        // Now accepts isEmergency boolean
        const { sender, messageText, isEmergency = false } = req.body;
        
        // Find the report either by ID or Alias
        let report;
        if (req.params.id) {
            report = await Report.findById(req.params.id);
        } else if (req.params.alias) {
             report = await Report.findOne({ alias: req.params.alias });
        } else {
             return res.status(400).json({ message: 'Missing identifier.' });
        }

        if (!report) return res.status(404).json({ message: 'Report not found.' });

        // Add new message with emergency flag
        report.messages.push({ sender, messageText, isEmergency });
        await report.save();

        const io = req.app.get('socketio');
        io.to(`report-${report.alias}`).emit('newMessage', report.messages);

        // **NEW:** If emergency, send a distinct alert to all admins
        if (isEmergency) {
             io.to('admins').emit('emergencyAlert', { alias: report.alias, message: messageText });
        }

        res.status(201).json({ message: 'Message sent', messages: report.messages });

    } catch (error) {
        console.error('Error posting message:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

// 5. Fetch Reports (Admin/User)
exports.getReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 }); 
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error fetching reports.' });
    }
};

// 6. Get messages/details for a single report by ID OR ALIAS 
exports.getReportById = async (req, res) => {
    try {
        const identifier = req.params.id || req.params.alias;
        
        // Try to find by MongoDB _id first (if it looks like one)
        let report = null;
        if (identifier && identifier.length === 24 && identifier.match(/^[0-9a-fA-F]{24}$/)) {
            report = await Report.findById(identifier);
        }
        
        // If not found by ID or ID wasn't provided, search by alias
        if (!report && identifier) {
            report = await Report.findOne({ alias: identifier });
        }

        if (!report) return res.status(404).json({ message: 'Report not found.' });
        res.status(200).json(report);
    } catch (error) {
        console.error('Error fetching single report:', error);
        res.status(500).json({ message: 'Internal server error during report lookup.' });
    }
};