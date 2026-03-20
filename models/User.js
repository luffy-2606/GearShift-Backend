const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

class User {
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'user' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        role,
        status: 'active',
        created_at: new Date().toISOString()
      }])
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
      .select('id, email, firstName, lastName, role, status, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async updateById(id, updateData) {
    // Map frontend field names to database column names
    const mappedData = {};
    if (updateData.firstName) mappedData.firstName = updateData.firstName;
    if (updateData.lastName) mappedData.lastName = updateData.lastName;
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

  
  // == Upsert a profile row from Supabase auth user data. ==
  static async upsertByEmail({ email, firstName, lastName }) {
    const normalizedEmail = email?.toLowerCase?.();
    if (!normalizedEmail) {
      throw new Error('Email is required for upsertByEmail');
    }

    // Insert-first approach to avoid "find then insert" races.
    // If a concurrent request inserted the row, we catch the unique constraint error
    // and return/update the existing profile instead of failing.
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: normalizedEmail,
          password: null,
          firstName: firstName || '',
          lastName: lastName || '',
          role: 'user',
          status: 'active',
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      if (err?.code !== '23505') {
        throw err;
      }

      // Unique violation: the row was inserted by another request.
      const existing = await User.findByEmail(normalizedEmail);
      if (!existing) throw err;

      // Only update names if we have improvements; do not touch password/role/status.
      const updates = {};
      if (firstName && existing.firstName !== firstName) updates.firstName = firstName;
      if (lastName && existing.lastName !== lastName) updates.lastName = lastName;

      if (Object.keys(updates).length === 0) return existing;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }
}

module.exports = User;
