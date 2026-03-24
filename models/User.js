const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

class User {
  static async create(userData) {
    const { email, password, first_name, last_name, role = 'user' } = userData;
    
    // Create user object
    const userObj = {
      email: email.toLowerCase(),
      first_name: first_name,
      last_name: last_name,
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
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userObj])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabaseAdmin
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
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findAll() {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, status, created_at, last_login')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async updateById(id, updateData) {
    const mappedData = {};
    if (updateData.first_name || updateData.firstName) {
      mappedData.first_name = updateData.first_name || updateData.firstName;
    }
    if (updateData.last_name || updateData.lastName) {
      mappedData.last_name = updateData.last_name || updateData.lastName;
    }
    if (updateData.status)     mappedData.status     = updateData.status;
    if (updateData.role)       mappedData.role       = updateData.role;
    if (updateData.last_login) mappedData.last_login = updateData.last_login;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(mappedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create a user directly (used by admin panel). 
  static async adminCreate({ email, password, first_name, last_name, role = 'user', status = 'active' }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        email: email.toLowerCase(),
        password: hashedPassword,
        first_name,
        last_name,
        role,
        status,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteById(id) {
    const { error } = await supabaseAdmin
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
  static async upsertByEmail({ email, first_name, last_name }) {
    const normalizedEmail = email?.toLowerCase?.();
    if (!normalizedEmail) {
      throw new Error('Email is required for upsertByEmail');
    }

    // Insert-first approach to avoid "find then insert" races.
    // If a concurrent request inserted the row, we catch the unique constraint error
    // and return/update the existing profile instead of failing.
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{
          email: normalizedEmail,
          password: null,
          first_name: first_name || '',
          last_name: last_name || '',
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
      if (first_name && existing.first_name !== first_name) updates.first_name = first_name;
      if (last_name && existing.last_name !== last_name) updates.last_name = last_name;

      if (Object.keys(updates).length === 0) return existing;

      const { data, error } = await supabaseAdmin
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
