const { supabaseAdmin } = require('../config/supabase');

const ENTITY_TYPES = new Set([
  'shop',
  'mechanic',
  'appointment',
  'cost_insight',
  'quote_snapshot',
  'parts_bundle',
]);

const MAX_TITLE = 255;
const MAX_NOTES = 10000;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 64;
const MAX_SNAPSHOT_BYTES = 32000;

function getUserId(req) {
  return req.user.id ?? req.user.userId;
}

function normalizeTags(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',').map((t) => t.trim());
  const out = [];
  for (const t of arr) {
    if (!t || out.length >= MAX_TAGS) break;
    const s = String(t).trim().slice(0, MAX_TAG_LEN);
    if (s) out.push(s);
  }
  return [...new Set(out)];
}

function snapshotSizeOk(obj) {
  try {
    return Buffer.byteLength(JSON.stringify(obj || {}), 'utf8') <= MAX_SNAPSHOT_BYTES;
  } catch {
    return false;
  }
}

async function buildSnapshotForEntity(entityType, entityId, clientSnapshot, userId) {
  let base = clientSnapshot && typeof clientSnapshot === 'object' ? { ...clientSnapshot } : {};

  if (entityType === 'shop' && entityId) {
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('id, name, address, phone, website, description, average_rating, services_offered')
      .eq('id', entityId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!shop) return { error: 'Shop not found', status: 404 };
    base = {
      ...base,
      shopId: shop.id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      website: shop.website,
      description: shop.description,
      average_rating: shop.average_rating,
      services_offered: shop.services_offered,
    };
  }

  if (entityType === 'mechanic' && entityId) {
    const { data: m, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone, bio, specialization, shop_address, years_experience')
      .eq('id', entityId)
      .eq('role', 'mechanic')
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!m) return { error: 'Mechanic not found', status: 404 };
    base = {
      ...base,
      mechanicId: m.id,
      name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
      phone: m.phone,
      bio: m.bio,
      specialization: m.specialization,
      shop_address: m.shop_address,
      years_experience: m.years_experience,
    };
  }

  if (entityType === 'appointment' && entityId) {
    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .select('id, service_name, estimated_cost, scheduled_date, status, customer_notes, shop_id, mechanic_id')
      .eq('id', entityId)
      .eq('customer_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!appt) return { error: 'Appointment not found', status: 404 };

    const [{ data: shopRow }, { data: mechRow }] = await Promise.all([
      supabaseAdmin.from('shops').select('id, name, address, phone').eq('id', appt.shop_id).maybeSingle(),
      supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', appt.mechanic_id)
        .maybeSingle(),
    ]);

    base = {
      ...base,
      appointmentId: appt.id,
      service_name: appt.service_name,
      estimated_cost: appt.estimated_cost,
      scheduled_date: appt.scheduled_date,
      status: appt.status,
      shop: shopRow,
      mechanic: mechRow
        ? {
            id: mechRow.id,
            name: `${mechRow.first_name || ''} ${mechRow.last_name || ''}`.trim(),
          }
        : null,
    };
  }

  if (entityType === 'cost_insight' && entityId) {
    const { data: row, error } = await supabaseAdmin
      .from('cost_insights')
      .select('*')
      .eq('id', entityId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { error: 'Cost insight not found', status: 404 };
    base = {
      ...base,
      costInsightId: row.id,
      service_type: row.service_type,
      location_name: row.location_name,
      avg_cost: row.avg_cost,
      min_cost: row.min_cost,
      max_cost: row.max_cost,
      median_cost: row.median_cost,
      last_updated: row.last_updated,
    };
  }

  if (entityType === 'quote_snapshot' || entityType === 'parts_bundle') {
    if (!base || Object.keys(base).length === 0) {
      return { error: 'snapshot body required for this type', status: 400 };
    }
  }

  return { snapshot: base };
}

async function listBookmarks(req, res) {
  try {
    const userId = getUserId(req);
    const { tag, entity_type, favorites_only } = req.query;

    let q = supabaseAdmin
      .from('user_saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (entity_type && ENTITY_TYPES.has(entity_type)) {
      q = q.eq('entity_type', entity_type);
    }
    if (favorites_only === '1' || favorites_only === 'true') {
      q = q.eq('is_favorite', true);
    }
    const { data, error } = await q;
    if (error) throw error;

    let results = data || [];

    // Case-insensitive tag filtering (partial match)
    if (tag && String(tag).trim()) {
      const tagLower = String(tag).trim().toLowerCase();
      results = results.filter(item => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        return tags.some(t => String(t).toLowerCase().includes(tagLower));
      });
    }

    return res.json({ success: true, data: results });
  } catch (e) {
    console.error('listBookmarks', e);
    return res.status(500).json({ success: false, message: 'Failed to load saved items' });
  }
}

async function createBookmark(req, res) {
  try {
    const userId = getUserId(req);
    const {
      entity_type,
      entity_id: entityIdRaw,
      snapshot: clientSnapshot,
      title,
      notes,
      tags,
      is_favorite,
    } = req.body || {};

    if (!entity_type || !ENTITY_TYPES.has(entity_type)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing entity_type' });
    }

    const entity_id = entityIdRaw || null;
    const typesNeedingId = ['shop', 'mechanic', 'appointment', 'cost_insight'];
    if (typesNeedingId.includes(entity_type) && !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_id required for this type' });
    }

    if (title != null && String(title).length > MAX_TITLE) {
      return res.status(400).json({ success: false, message: 'Title too long' });
    }
    if (notes != null && String(notes).length > MAX_NOTES) {
      return res.status(400).json({ success: false, message: 'Notes too long' });
    }

    const tagList = normalizeTags(tags);
    const merged = await buildSnapshotForEntity(entity_type, entity_id, clientSnapshot, userId);
    if (merged.error) {
      return res.status(merged.status || 400).json({ success: false, message: merged.error });
    }
    if (!snapshotSizeOk(merged.snapshot)) {
      return res.status(400).json({ success: false, message: 'Snapshot too large' });
    }

    if (entity_id) {
      const { data: existing } = await supabaseAdmin
        .from('user_saved_items')
        .select('id')
        .eq('user_id', userId)
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Already saved',
          existingId: existing.id,
        });
      }
    }

    const row = {
      user_id: userId,
      entity_type,
      entity_id,
      snapshot: merged.snapshot,
      title: title != null ? String(title).slice(0, MAX_TITLE) : null,
      notes: notes != null ? String(notes).slice(0, MAX_NOTES) : null,
      tags: tagList,
      is_favorite: Boolean(is_favorite),
    };

    const { data, error } = await supabaseAdmin.from('user_saved_items').insert([row]).select().single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Already saved' });
      }
      throw error;
    }
    return res.status(201).json({ success: true, data });
  } catch (e) {
    console.error('createBookmark', e);
    return res.status(500).json({ success: false, message: 'Failed to save item' });
  }
}

async function updateBookmark(req, res) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, notes, tags, is_favorite, snapshot } = req.body || {};

    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('user_saved_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!current) return res.status(404).json({ success: false, message: 'Not found' });

    const patch = {};
    if (title !== undefined) patch.title = title == null ? null : String(title).slice(0, MAX_TITLE);
    if (notes !== undefined) patch.notes = notes == null ? null : String(notes).slice(0, MAX_NOTES);
    if (tags !== undefined) patch.tags = normalizeTags(tags);
    if (is_favorite !== undefined) patch.is_favorite = Boolean(is_favorite);
    if (snapshot !== undefined) {
      if (!snapshotSizeOk(snapshot)) {
        return res.status(400).json({ success: false, message: 'Snapshot too large' });
      }
      patch.snapshot = snapshot;
    }

    const { data, error } = await supabaseAdmin
      .from('user_saved_items')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e) {
    console.error('updateBookmark', e);
    return res.status(500).json({ success: false, message: 'Failed to update' });
  }
}

async function deleteBookmark(req, res) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('user_saved_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e) {
    console.error('deleteBookmark', e);
    return res.status(500).json({ success: false, message: 'Failed to delete' });
  }
}

module.exports = {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
};
