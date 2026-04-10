const express = require('express');
const VehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All vehicle routes require authentication
router.use(authenticateToken);

// Customer vehicle routes
router.get('/', VehicleController.getCustomerVehicles);
router.post('/', VehicleController.addVehicle);
router.get('/:vehicleId/service-history', VehicleController.getVehicleServiceHistory);
router.put('/:vehicleId/mileage', VehicleController.updateVehicleMileage);

module.exports = router;
