const express = require('express');
const AppointmentController = require('../controllers/appointmentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All appointment routes require authentication
router.use(authenticateToken);

// Customer appointment routes
router.post('/', AppointmentController.bookAppointment);
router.get('/', AppointmentController.getCustomerAppointments);
router.put('/:appointmentId/status', AppointmentController.updateAppointmentStatus);
router.post('/:appointmentId/service-history', AppointmentController.addToServiceHistory);

module.exports = router;
