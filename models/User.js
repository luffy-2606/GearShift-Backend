const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'user', googleId } = userData;
    
    // Create user object
    const userObj = {
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      role,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    // Add password if provided (email registration)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      userObj.password = hashedPassword;
    }
    
    // Add Google ID if provided (Google registration)
    if (googleId) {
      userObj.google_id = googleId;
    }
    
    // Create user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([userObj])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findByGoogleId(googleId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async updateById(id, updateData) {
    // Map frontend field names to database column names
    const mappedData = {};
    if (updateData.firstName) mappedData.first_name = updateData.firstName;
    if (updateData.lastName) mappedData.last_name = updateData.lastName;
    if (updateData.status) mappedData.status = updateData.status;
    if (updateData.last_login) mappedData.last_login = updateData.last_login;
    
    const { data, error } = await supabase
      .from('users')
      .update(mappedData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteById(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
