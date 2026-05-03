const { supabaseAdmin } = require('../config/supabase');

class ShopController {
  // Get all verified shops with location filtering
  static async getShops(req, res) {
    try {
      const { latitude, longitude, radius = 50, service_type } = req.query;
      
      let query = supabaseAdmin
        .from('shops')
        .select(`
          *,
          owner:users!shops_owner_id_fkey(
            first_name, 
            last_name, 
            phone,
            years_experience,
            specialization
          )
        `)
        .eq('status', 'active')
        .eq('is_verified', true)
        .order('average_rating', { ascending: false });

      // Filter by service type if provided
      if (service_type) {
        query = query.contains('services_offered', [service_type]);
      }

      const { data: shops, error } = await query;

      if (error) throw error;

      // Fetch services for all shops
      const shopIds = shops.map(shop => shop.id);
      const { data: allServices } = await supabaseAdmin
        .from('services')
        .select('id, name, base_price')
        .in('name', shops.flatMap(shop => shop.services_offered || []))
        .eq('is_active', true);

      // Add services to each shop
      const shopsWithServices = await Promise.all(shops.map(async (shop) => {
        const shopServices = (allServices || []).filter(service => 
          (shop.services_offered || []).includes(service.name)
        );
        return {
          ...shop,
          available_services: shopServices
        };
      }));

      // Filter by distance if coordinates provided
      let filteredShops = shopsWithServices;
      if (latitude && longitude) {
        filteredShops = shopsWithServices.filter(shop => {
          const distance = calculateDistance(
            parseFloat(latitude), 
            parseFloat(longitude),
            shop.latitude, 
            shop.longitude
          );
          return distance <= radius;
        });
      }

      res.json({
        success: true,
        data: filteredShops,
        count: filteredShops.length
      });
    } catch (error) {
      console.error('Get shops error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch shops' 
      });
    }
  }

  // Get shop details with services
  static async getShopDetails(req, res) {
    try {
      const { shopId } = req.params;

      const { data: shop, error } = await supabaseAdmin
        .from('shops')
        .select(`
          *,
          owner:users!shops_owner_id_fkey(
            first_name, 
            last_name, 
            phone,
            years_experience,
            specialization,
            bio
          )
        `)
        .eq('id', shopId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Shop not found'
          });
        }
        throw error;
      }

      // Get available services for this shop
      const { data: availableServices } = await supabaseAdmin
        .from('services')
        .select('*')
        .in('name', shop.services_offered)
        .eq('is_active', true);

      res.json({
        success: true,
        data: {
          ...shop,
          available_services: availableServices || []
        }
      });
    } catch (error) {
      console.error('Get shop details error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch shop details' 
      });
    }
  }

  // Get shop availability (simplified - returns available time slots)
  static async getShopAvailability(req, res) {
    try {
      const { shopId } = req.params;
      const { date } = req.query;

      // For now, return basic availability
      // In production, this would check existing appointments
      const availability = {
        date: date || new Date().toISOString().split('T')[0],
        available_slots: [
          '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
        ],
        booked_slots: []
      };

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch availability' 
      });
    }
  }
}

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = ShopController;
