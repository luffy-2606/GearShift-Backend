const { supabaseAdmin } = require('../config/supabase');

class CostInsightsController {
  // Get cost insights for a customer
  static async getCostInsights(req, res) {
    try {
      const userId = req.user.id;
      
      // Get all vehicles for the user
      const { data: vehicles, error: vehiclesError } = await supabaseAdmin
        .from('vehicles')
        .select('id, make, model, year, license_plate')
        .eq('user_id', userId);

      if (vehiclesError) throw vehiclesError;

      // Get all service history for all user's vehicles
      const vehicleIds = vehicles.map(v => v.id);
      const { data: services, error: servicesError } = await supabaseAdmin
        .from('service_history')
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, license_plate),
          appointment:appointments(id, service_name, scheduled_date, shop_id, mechanic_id),
          shop:shops(id, name, address),
          mechanic:users(id, first_name, last_name, business_name)
        `)
        .in('vehicle_id', vehicleIds)
        .order('service_date', { ascending: false });

      if (servicesError) throw servicesError;

      // Calculate cost insights
      const totalSpent = services.reduce((sum, service) => {
        return sum + (service.total_cost || 0);
      }, 0);

      // Calculate spending by vehicle
      const spendingByVehicle = vehicles.map(vehicle => {
        const vehicleServices = services.filter(s => s.vehicle_id === vehicle.id);
        const vehicleTotal = vehicleServices.reduce((sum, service) => {
          return sum + (service.total_cost || 0);
        }, 0);
        
        return {
          vehicle: vehicle,
          totalSpent: vehicleTotal,
          serviceCount: vehicleServices.length,
          averageCostPerService: vehicleServices.length > 0 ? vehicleTotal / vehicleServices.length : 0
        };
      });

      // Calculate spending by service type
      const spendingByServiceType = {};
      services.forEach(service => {
        const serviceType = service.service_type || 'Other';
        if (!spendingByServiceType[serviceType]) {
          spendingByServiceType[serviceType] = {
            totalSpent: 0,
            serviceCount: 0,
            averageCost: 0
          };
        }
        spendingByServiceType[serviceType].totalSpent += service.total_cost || 0;
        spendingByServiceType[serviceType].serviceCount += 1;
      });

      // Calculate average costs for service types
      Object.keys(spendingByServiceType).forEach(serviceType => {
        const data = spendingByServiceType[serviceType];
        data.averageCost = data.serviceCount > 0 ? data.totalSpent / data.serviceCount : 0;
      });

      // Calculate spending by month (last 12 months)
      const spendingByMonth = {};
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        spendingByMonth[monthKey] = 0;
      }

      services.forEach(service => {
        if (service.service_date) {
          const monthKey = service.service_date.slice(0, 7);
          if (spendingByMonth.hasOwnProperty(monthKey)) {
            spendingByMonth[monthKey] += service.total_cost || 0;
          }
        }
      });

      // Calculate spending by shop/mechanic
      const spendingByProvider = {};
      services.forEach(service => {
        let providerName = 'Unknown';
        if (service.shop) {
          providerName = service.shop.name;
        } else if (service.mechanic) {
          providerName = service.mechanic.business_name || 
            `${service.mechanic.first_name} ${service.mechanic.last_name}`;
        }

        if (!spendingByProvider[providerName]) {
          spendingByProvider[providerName] = {
            totalSpent: 0,
            serviceCount: 0,
            providerType: service.shop ? 'Shop' : 'Mechanic'
          };
        }
        spendingByProvider[providerName].totalSpent += service.total_cost || 0;
        spendingByProvider[providerName].serviceCount += 1;
      });

      // Get most expensive services
      const mostExpensiveServices = services
        .filter(s => s.total_cost > 0)
        .sort((a, b) => b.total_cost - a.total_cost)
        .slice(0, 5);

      // Get recent services
      const recentServices = services.slice(0, 10);

      res.json({
        success: true,
        data: {
          totalSpent,
          totalServices: services.length,
          averageCostPerService: services.length > 0 ? totalSpent / services.length : 0,
          spendingByVehicle: spendingByVehicle.sort((a, b) => b.totalSpent - a.totalSpent),
          spendingByServiceType,
          spendingByMonth,
          spendingByProvider,
          mostExpensiveServices,
          recentServices,
          vehicles,
          services
        }
      });
    } catch (error) {
      console.error('Get cost insights error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch cost insights' 
      });
    }
  }

  // Get spending trends over time
  static async getSpendingTrends(req, res) {
    try {
      const userId = req.user.id;
      const { period = '12months' } = req.query;

      // Get all vehicles for the user
      const { data: vehicles, error: vehiclesError } = await supabaseAdmin
        .from('vehicles')
        .select('id')
        .eq('user_id', userId);

      if (vehiclesError) throw vehiclesError;

      // Get all service history for all user's vehicles
      const vehicleIds = vehicles.map(v => v.id);
      const { data: services, error: servicesError } = await supabaseAdmin
        .from('service_history')
        .select('service_date, total_cost, service_type')
        .in('vehicle_id', vehicleIds)
        .not('service_date', 'is', null)
        .order('service_date', { ascending: true });

      if (servicesError) throw servicesError;

      // Group spending by month
      const monthlySpending = {};
      services.forEach(service => {
        const monthKey = service.service_date.slice(0, 7);
        if (!monthlySpending[monthKey]) {
          monthlySpending[monthKey] = 0;
        }
        monthlySpending[monthKey] += service.total_cost || 0;
      });

      // Convert to array format for charts
      const trends = Object.keys(monthlySpending)
        .sort()
        .map(month => ({
          month,
          amount: monthlySpending[month]
        }));

      res.json({
        success: true,
        data: {
          trends,
          totalSpent: Object.values(monthlySpending).reduce((sum, amount) => sum + amount, 0)
        }
      });
    } catch (error) {
      console.error('Get spending trends error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch spending trends' 
      });
    }
  }
}

module.exports = CostInsightsController;
