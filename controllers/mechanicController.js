const { supabaseAdmin } = require('../config/supabase');

class MechanicController {
  // Get list of mechanics with filtering options
  static async getMechanics(req, res) {
    try {
      const { latitude, longitude, radius, service_type, specialization } = req.query;
      
      let query = supabaseAdmin
        .from('users')
        .select('*')
        .eq('role', 'mechanic')
        .eq('status', 'active');

      const { data: mechanics, error } = await query;

      if (error) throw error;

      // Case-insensitive specialization filtering (both service_type and specialization)
      const serviceTypeLower = service_type ? service_type.toLowerCase() : null;
      const specializationLower = specialization ? specialization.toLowerCase() : null;

      const specFiltered = mechanics.filter(mechanic => {
        const specs = Array.isArray(mechanic.specialization)
          ? mechanic.specialization.map(s => s.toLowerCase())
          : mechanic.specialization
            ? [mechanic.specialization.toLowerCase()]
            : [];

        if (serviceTypeLower && specializationLower) {
          return specs.some(s => s === serviceTypeLower) || specs.some(s => s === specializationLower);
        } else if (serviceTypeLower) {
          return specs.some(s => s === serviceTypeLower);
        } else if (specializationLower) {
          return specs.some(s => s === specializationLower);
        }
        return true;
      });

      // Calculate ratings and add distance if location provided
      const processedMechanics = specFiltered.map(mechanic => {
        // Calculate distance if location provided
        let distance = null;
        if (latitude && longitude && mechanic.shop_latitude && mechanic.shop_longitude) {
          distance = MechanicController.calculateDistance(
            parseFloat(latitude), 
            parseFloat(longitude),
            mechanic.shop_latitude, 
            mechanic.shop_longitude
          );
        }

        return {
          ...mechanic,
          total_reviews: 0,
          average_rating: 0,
          distance: distance,
          is_independent: !mechanic.shop_address
        };
      });

      // Filter by radius if provided
      let filteredMechanics = processedMechanics;
      if (radius && latitude && longitude) {
        filteredMechanics = processedMechanics.filter(mechanic => 
          mechanic.distance !== null && mechanic.distance <= parseFloat(radius)
        );
      }

      // Sort by rating and distance
      filteredMechanics.sort((a, b) => {
        if (a.distance === null && b.distance === null) return b.average_rating - a.average_rating;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        if (Math.abs(a.distance - b.distance) < 5) return b.average_rating - a.average_rating;
        return a.distance - b.distance;
      });

      res.json({
        success: true,
        data: filteredMechanics
      });
    } catch (error) {
      console.error('Get mechanics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch mechanics' 
      });
    }
  }

  // Calculate distance between two coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

module.exports = MechanicController;
