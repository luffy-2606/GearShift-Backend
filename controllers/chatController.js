const OpenAI = require('openai');
const { supabaseAdmin } = require('../config/supabase');
const User = require('../models/User');

const MAX_MESSAGE_LENGTH = 2000;

// ─── retry helper ───────────────────────────────────────────────────────────

async function retryWithBackoff(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms for error:`, err.message);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

// ─── context helpers ─────────────────────────────────────────────────────────

async function fetchMechanics() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, phone, bio, specialization, years_experience, shop_address, shop_latitude, shop_longitude')
    .eq('role', 'mechanic')
    .eq('status', 'active');

  if (error) throw error;
  return (data || []).map(m => ({
    name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
    phone: m.phone || null,
    bio: m.bio || null,
    specialization: m.specialization || [],
    years_experience: m.years_experience || null,
    location: m.shop_address || null,
  }));
}

async function fetchShops() {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('id, name, address, phone, website, services_offered, average_rating, description, is_verified')
    .eq('status', 'active')
    .eq('is_verified', true)
    .order('average_rating', { ascending: false });

  if (error) throw error;
  return (data || []).map(s => ({
    name: s.name,
    address: s.address || null,
    phone: s.phone || null,
    website: s.website && String(s.website).trim() ? String(s.website).trim() : null,
    services_offered: s.services_offered || [],
    average_rating: s.average_rating || null,
    description: s.description || null,
  }));
}

async function fetchMechanicsWithRetry() {
  return retryWithBackoff(fetchMechanics, 3, 1000);
}

async function fetchShopsWithRetry() {
  return retryWithBackoff(fetchShops, 3, 1000);
}

async function fetchUserContextWithRetry(userId) {
  return retryWithBackoff(() => fetchUserContext(userId), 3, 1000);
}

async function fetchUserContext(userId) {
  // Profile
  const profile = await User.findById(userId);
  const safeProfile = profile
    ? {
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
        email: profile.email,
        budget: profile.budget || null,
        member_since: profile.created_at ? profile.created_at.slice(0, 10) : null,
      }
    : { name: 'User' };

  // Vehicles
  const { data: vehicles, error: vErr } = await supabaseAdmin
    .from('vehicles')
    .select('id, make, model, year, mileage, fuel_type, transmission, color, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (vErr) throw vErr;

  // Service history for all vehicles
  const vehicleList = vehicles || [];
  const vehiclesWithHistory = await Promise.all(
    vehicleList.map(async (vehicle) => {
      const { data: history, error: hErr } = await supabaseAdmin
        .from('service_history')
        .select(`
          service_date,
          service_type,
          service_description,
          total_cost,
          mileage_at_service,
          shop:shops(name, address),
          mechanic:users(first_name, last_name)
        `)
        .eq('vehicle_id', vehicle.id)
        .order('service_date', { ascending: false })
        .limit(10);

      if (hErr) {
        console.error('Chat: service history fetch error', hErr);
      }

      return {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        color: vehicle.color || null,
        notes: vehicle.notes || null,
        service_history: (history || []).map(h => ({
          date: h.service_date,
          type: h.service_type,
          description: h.service_description,
          cost: h.total_cost,
          mileage_at_service: h.mileage_at_service,
          shop: h.shop ? h.shop.name : null,
          mechanic: h.mechanic
            ? `${h.mechanic.first_name || ''} ${h.mechanic.last_name || ''}`.trim()
            : null,
        })),
      };
    })
  );

  return { profile: safeProfile, vehicles: vehiclesWithHistory };
}

// ─── prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(userContext, mechanics, shops, userMessage) {
  const context = {
    user: userContext.profile,
    vehicles: userContext.vehicles,
    available_mechanics: mechanics,
    available_shops: shops,
  };

  return (
    `The following is structured JSON data about the current GearShift user, ` +
    `their vehicles, service history, and all available mechanics and workshops:\n\n` +
    `${JSON.stringify(context, null, 2)}\n\n` +
    `---\n` +
    `User question: ${userMessage}`
  );
}

// ─── system instruction ───────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are GearShift Assistant, a helpful automotive advisor built into the GearShift app.

Rules:
- Answer only using the JSON context provided in the user turn. Do not invent mechanics, shops, or services not listed there.
- Give concise, practical recommendations. When recommending a mechanic or shop, mention their name, relevant specialization or services offered, and — if applicable — any past visits the user has had with them.
- When a workshop includes a website URL in the JSON context, include that URL in your reply so the user can visit it (use the exact string provided).
- If the data doesn't contain enough information to answer confidently, say so honestly.
- Keep replies short and direct — this is a chat interface, not a report.
- Do not reveal raw JSON or internal data structures to the user.`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Call Groq — single attempt, no retry. */
async function generateGroqReply(client, modelName, userMessage) {
  const completion = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content || '';
}

// ─── controller ──────────────────────────────────────────────────────────────

async function chat(req, res) {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ success: false, message: `Message must be under ${MAX_MESSAGE_LENGTH} characters.` });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ success: false, message: 'Chat service is not configured.' });
  }

  const userId = req.user.id ?? req.user.userId;

  try {
    const [mechanics, shops, userContext] = await Promise.all([
      fetchMechanicsWithRetry().catch(err => {
        console.error('Failed to fetch mechanics after retries:', err);
        return [];
      }),
      fetchShopsWithRetry().catch(err => {
        console.error('Failed to fetch shops after retries:', err);
        return [];
      }),
      fetchUserContextWithRetry(userId).catch(err => {
        console.error('Failed to fetch user context after retries:', err);
        return { profile: { name: 'User' }, vehicles: [] };
      }),
    ]);

    const prompt = buildPrompt(userContext, mechanics, shops, message.trim());

    const groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const reply = await generateGroqReply(groqClient, modelName, prompt);

    return res.json({ success: true, reply });
  } catch (error) {
    console.error('Chat controller error:', error);
    if (error?.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          'Chat is rate-limited right now. Please wait a moment and try again.',
      });
    }
    if (error?.code === 'EAI_AGAIN' || error?.message?.includes('EAI_AGAIN') || error?.message?.includes('getaddrinfo')) {
      return res.status(503).json({
        success: false,
        message: 'Unable to connect to the database. Please check your internet connection and try again.',
      });
    }
    const status = error?.status >= 400 && error?.status < 600 ? error.status : 502;
    return res.status(status).json({ success: false, message: 'Failed to get a response. Please try again.' });
  }
}

module.exports = { chat };
