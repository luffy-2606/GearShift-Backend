const { supabaseAdmin } = require('../config/supabase');

class VehicleController {
  // Get customer vehicles
  static async getCustomerVehicles(req, res) {
    try {
      const customer_id = req.user.id;

      const { data: vehicles, error } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('user_id', customer_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: vehicles || []
      });
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch vehicles' 
      });
    }
  }

  // Get service history for a vehicle
  static async getVehicleServiceHistory(req, res) {
    try {
      const { vehicleId } = req.params;
      const customer_id = req.user.id;

      // Validate vehicle belongs to customer
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('user_id', customer_id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Get service history
      const { data: serviceHistory, error } = await supabaseAdmin
        .from('service_history')
        .select(`
          *,
          shop:shops(id, name, address, phone),
          mechanic:users(id, first_name, last_name)
        `)
        .eq('vehicle_id', vehicleId)
        .order('service_date', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data: serviceHistory || []
      });
    } catch (error) {
      console.error('Get service history error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch service history' 
      });
    }
  }

  // Add new vehicle
  static async addVehicle(req, res) {
    try {
      const { 
        make, 
        model, 
        year, 
        vin, 
        license_plate, 
        color, 
        mileage, 
        fuel_type, 
        transmission, 
        notes 
      } = req.body;

      const customer_id = req.user.id;

      const { data: vehicle, error } = await supabaseAdmin
        .from('vehicles')
        .insert([{
          user_id: customer_id,
          make: make.trim(),
          model: model.trim(),
          year: parseInt(year),
          vin: vin ? vin.trim().toUpperCase() : null,
          license_plate: license_plate ? license_plate.trim().toUpperCase() : null,
          color: color ? color.trim() : null,
          mileage: mileage ? parseInt(mileage) : 0,
          fuel_type: fuel_type || 'gasoline',
          transmission: transmission || 'automatic',
          notes: notes ? notes.trim() : null
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({
            success: false,
            message: 'Vehicle with this VIN already exists'
          });
        }
        throw error;
      }

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('Add vehicle error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add vehicle' 
      });
    }
  }

  // Update vehicle mileage (after service)
  static async updateVehicleMileage(req, res) {
    try {
      const { vehicleId } = req.params;
      const { mileage } = req.body;
      const customer_id = req.user.id;

      // Validate vehicle belongs to customer
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('id, mileage')
        .eq('id', vehicleId)
        .eq('user_id', customer_id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Only allow mileage to increase
      if (mileage <= vehicle.mileage) {
        return res.status(400).json({
          success: false,
          message: 'New mileage must be greater than current mileage'
        });
      }

      const { data: updatedVehicle, error } = await supabaseAdmin
        .from('vehicles')
        .update({ 
          mileage: parseInt(mileage),
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Vehicle mileage updated successfully',
        data: updatedVehicle
      });
    } catch (error) {
      console.error('Update mileage error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update vehicle mileage' 
      });
    }
  }
}

module.exports = VehicleController;
