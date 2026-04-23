const { supabaseAdmin } = require('../config/supabase');

class AppointmentController {
  // Book new appointment
  static async bookAppointment(req, res) {
    try {
      const { 
        shop_id, 
        vehicle_id, 
        service_id, 
        service_name, 
        service_description, 
        scheduled_date,
        customer_notes,
        estimated_cost
      } = req.body;

      const customer_id = req.user.id; // From auth middleware

      // Validate shop exists and is active
      const { data: shop, error: shopError } = await supabaseAdmin
        .from('shops')
        .select('owner_id')
        .eq('id', shop_id)
        .eq('status', 'active')
        .single();

      if (shopError || !shop) {
        return res.status(404).json({
          success: false,
          message: 'Shop not found or inactive'
        });
      }

      // Validate vehicle belongs to customer
      const { data: vehicle, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('id', vehicle_id)
        .eq('user_id', customer_id)
        .single();

      if (vehicleError || !vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }

      // Create appointment
      const { data: appointment, error } = await supabaseAdmin
        .from('appointments')
        .insert([{
          customer_id,
          mechanic_id: shop.owner_id,
          shop_id,
          vehicle_id,
          service_id,
          service_name,
          service_description,
          scheduled_date: new Date(scheduled_date).toISOString(),
          customer_notes,
          estimated_cost: estimated_cost || null,
          status: 'scheduled'
        }])
        .select(`
          *,
          shop:shops(id, name, address, phone),
          vehicle:vehicles(id, make, model, year)
        `)
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Book appointment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to book appointment' 
      });
    }
  }

  // Get customer appointments
  static async getCustomerAppointments(req, res) {
    try {
      const customer_id = req.user.id;
      const { status } = req.query;

      let query = supabaseAdmin
        .from('appointments')
        .select(`
          id,
          customer_id,
          mechanic_id,
          shop_id,
          vehicle_id,
          service_id,
          service_name,
          service_description,
          estimated_duration_minutes,
          estimated_cost,
          actual_cost,
          actual_duration_minutes,
          scheduled_date,
          arrival_date,
          start_date,
          completion_date,
          status,
          priority,
          customer_notes,
          mechanic_notes,
          created_at,
          updated_at,
          shop:shops(id, name, address, phone, latitude, longitude),
          vehicle:vehicles(id, make, model, year, license_plate),
          service:services(id, name, category, estimated_duration_minutes)
        `)
        .eq('customer_id', customer_id)
        .order('scheduled_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: appointments, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data: appointments || []
      });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch appointments' 
      });
    }
  }

  // Update appointment status (for visit confirmation)
  static async updateAppointmentStatus(req, res) {
    try {
      const { appointmentId } = req.params;
      const { status, actual_cost, actual_duration, mechanic_notes } = req.body;
      const customer_id = req.user.id;

      // Validate appointment belongs to customer
      const { data: appointment, error: checkError } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('customer_id', customer_id)
        .single();

      if (checkError || !appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Update appointment
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (actual_cost) updateData.actual_cost = actual_cost;
      if (actual_duration) updateData.actual_duration_minutes = actual_duration;
      if (mechanic_notes) updateData.mechanic_notes = mechanic_notes;

      if (status === 'completed') {
        updateData.completion_date = new Date().toISOString();
      }

      const { data: updatedAppointment, error } = await supabaseAdmin
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select(`
          *,
          shop:shops(id, name, address),
          vehicle:vehicles(id, make, model, year)
        `)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: updatedAppointment
      });
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update appointment' 
      });
    }
  }

  // Add service to history (after visit confirmation)
  static async addToServiceHistory(req, res) {
    try {
      const { appointmentId } = req.params;
      const { 
        service_type, 
        service_description, 
        cost, 
        labor_cost, 
        parts_cost, 
        notes,
        next_service_date,
        next_service_mileage 
      } = req.body;
      
      const customer_id = req.user.id;

      // Get appointment details
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, mileage),
          shop:shops(id, name, owner_id)
        `)
        .eq('id', appointmentId)
        .eq('customer_id', customer_id)
        .single();

      if (appointmentError || !appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      // Get current vehicle mileage
      const currentMileage = appointment.vehicle.mileage || 0;

      // Create service history entry
      const { data: serviceHistory, error } = await supabaseAdmin
        .from('service_history')
        .insert([{
          vehicle_id: appointment.vehicle_id,
          appointment_id: appointmentId,
          shop_id: appointment.shop_id,
          mechanic_id: appointment.shop.owner_id,
          service_type,
          service_description,
          mileage_at_service: currentMileage,
          service_date: new Date().toISOString(),
          cost: cost || 0,
          labor_cost: labor_cost || 0,
          parts_cost: parts_cost || 0,
          tax_amount: ((cost || 0) * 0.08), // 8% tax
          total_cost: cost || 0,
          duration_minutes: appointment.actual_duration_minutes || 60,
          notes,
          next_service_due_date: next_service_date ? new Date(next_service_date).toISOString() : null,
          next_service_due_mileage: next_service_mileage || null
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: 'Service added to history successfully',
        data: serviceHistory
      });
    } catch (error) {
      console.error('Add to service history error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to add service to history' 
      });
    }
  }
}

module.exports = AppointmentController;
