// server/routes/reports.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// Middleware to check admin secret (simple placeholder for security)
const checkAdminSecret = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Unauthorized: Invalid admin key.' });
    }
    next();
};

// --- USER & ADMIN ROUTES (Public/Private Access) ---

// POST /api/reports: Submit a new report (Public)
router.post('/', reportsController.submitReport);

// GET /api/reports/alias/:alias: Lookup report by alias (Public for tracking status)
// This is the CRITICAL route for the 'Track Status' feature
router.get('/alias/:alias', reportsController.getReportById);

// POST /api/reports/message/user/:alias: Send anonymous message (Public)
router.post('/message/user/:alias', reportsController.postMessage);

// --- ADMIN ONLY ROUTES ---

// GET /api/reports: Fetch all reports (Admin only)
router.get('/', checkAdminSecret, reportsController.getReports);

// PATCH /api/reports/:id/status: Update report status (Admin only)
router.patch('/:id/status', checkAdminSecret, reportsController.updateReportStatus);

// PATCH /api/reports/:id/assign: Assign case/simulate SMS (Admin only - NEW)
router.patch('/:id/assign', checkAdminSecret, reportsController.assignCase);

// POST /api/reports/message/admin/:id: Send message to user (Admin only)
router.post('/message/admin/:id', checkAdminSecret, reportsController.postMessage);

module.exports = router;