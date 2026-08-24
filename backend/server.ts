import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { initDb, dbQuery, dbRun, dbGet, hashPassword } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgridvoltkey123!';

app.use(cors());
app.use(express.json());

// List of connected SSE clients for realtime push
interface SSEClient {
  id: string;
  res: Response;
  role?: string;
  userId?: string;
}
let sseClients: SSEClient[] = [];

// Helper: Broadcast event to SSE clients
function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.res.write(payload);
  });
}

// Authentication Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Haversine Distance helper (in Km)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// REST API Endpoints

// 1. Auth endpoints
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { name, email, phone, password, role, ev_model, license_plate, vehicle_type, service_capability } = req.body;

  if (!email || !password || !role || !name || !phone) {
    return res.status(400).json({ error: 'Required fields missing: email, password, role, name, phone' });
  }

  try {
    const existing = await dbGet('SELECT * FROM auth_users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const passHash = hashPassword(password);

    await dbRun('INSERT INTO auth_users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      userId,
      email,
      passHash,
      role
    ]);

    await dbRun(
      'INSERT INTO profiles (id, name, phone, role, ev_model, license_plate, vehicle_type, service_capability) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, phone, role, ev_model || null, license_plate || null, vehicle_type || null, service_capability || null]
    );

    if (role === 'provider') {
      // Default to Jaipur/Udaipur center for mock coordination
      await dbRun('INSERT INTO providers (id, profile_id, availability, latitude, longitude) VALUES (?, ?, 1, 24.5854, 73.7125)', [
        'prov_' + Math.random().toString(36).substr(2, 9),
        userId
      ]);
    }

    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: userId, email, role, name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM auth_users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const hash = hashPassword(password);
    if (user.password_hash !== hash) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const profile = await dbGet('SELECT * FROM profiles WHERE id = ?', [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: profile?.name || 'User'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await dbGet('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json({ user: req.user, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/complete-profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, ev_model, license_plate, vehicle_type, service_capability } = req.body;
  try {
    await dbRun(
      'UPDATE profiles SET name = ?, phone = ?, ev_model = ?, license_plate = ?, vehicle_type = ?, service_capability = ? WHERE id = ?',
      [
        name,
        phone,
        ev_model || null,
        license_plate || null,
        vehicle_type || null,
        service_capability || null,
        req.user?.id
      ]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1.5 Profiles endpoints
app.get('/api/profiles', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role === 'admin') {
      const list = await dbQuery('SELECT * FROM profiles');
      res.json(list);
    } else {
      const profile = await dbGet('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
      res.json(profile ? [profile] : []);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profiles/complete-profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, ev_model, license_plate, vehicle_type, service_capability } = req.body;
  try {
    await dbRun(
      'UPDATE profiles SET name = ?, phone = ?, ev_model = ?, license_plate = ?, vehicle_type = ?, service_capability = ? WHERE id = ?',
      [
        name,
        phone,
        ev_model || null,
        license_plate || null,
        vehicle_type || null,
        service_capability || null,
        req.user?.id
      ]
    );
    const updated = await dbGet('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Providers endpoints
app.get('/api/providers', async (req: Request, res: Response) => {
  try {
    const list = await dbQuery(`
      SELECT p.id, p.profile_id, p.availability, p.latitude, p.longitude, pr.name, pr.phone, pr.vehicle_type, pr.service_capability, pr.license_plate
      FROM providers p
      JOIN profiles pr ON p.profile_id = pr.id
    `);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/providers/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { availability, latitude, longitude } = req.body;
  try {
    const provider = await dbGet('SELECT id FROM providers WHERE profile_id = ?', [req.user?.id]);
    if (!provider) return res.status(404).json({ error: 'Provider record not found' });

    if (availability !== undefined) {
      await dbRun('UPDATE providers SET availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        availability ? 1 : 0,
        provider.id
      ]);
    }
    if (latitude !== undefined && longitude !== undefined) {
      await dbRun('UPDATE providers SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        latitude,
        longitude,
        provider.id
      ]);
    }

    const updatedProvider = await dbGet(`
      SELECT p.id, p.profile_id, p.availability, p.latitude, p.longitude, pr.name, pr.phone
      FROM providers p
      JOIN profiles pr ON p.profile_id = pr.id
      WHERE p.id = ?
    `, [provider.id]);

    broadcastEvent('provider_update', updatedProvider);
    res.json(updatedProvider);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Requests core workflow (Intelligent Dispatch and Pricing)
app.post('/api/requests', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { latitude, longitude, service_type } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and Longitude are required for emergency request' });
  }

  try {
    // 1. Get all active & online providers
    const providersList = await dbQuery(`
      SELECT p.id, p.profile_id, p.latitude, p.longitude, pr.name, pr.phone, pr.vehicle_type, pr.service_capability, pr.license_plate
      FROM providers p
      JOIN profiles pr ON p.profile_id = pr.id
      WHERE p.availability = 1
    `);

    if (providersList.length === 0) {
      return res.status(404).json({ error: 'No available roadside service providers nearby at this moment' });
    }

    // 2. Intelligent Dispatch & Ranking Score
    // weights: distance = 0.4, ETA = 0.35, availability = 0.15 (handled by select filter), capability = 0.10
    const w1 = 0.4;
    const w2 = 0.35;
    const w4 = 0.10;

    const rankedProviders = providersList.map((prov: any) => {
      const distance = getHaversineDistance(latitude, longitude, prov.latitude, prov.longitude);
      // ETA: roughly 2.5 minutes per km plus a 5 minute buffer
      const eta = Math.round(distance * 2.5 + 5);

      // capability mismatch penalty: check if requested service matches capability
      // if service_type = towing, check if vehicle_type = truck or capability includes towing
      let capabilityMismatch = 0;
      if (service_type) {
        const capabilityText = (prov.service_capability || '').toLowerCase();
        const typeText = (prov.vehicle_type || '').toLowerCase();
        const queryText = service_type.toLowerCase();

        if (queryText.includes('tow') && !typeText.includes('truck') && !capabilityText.includes('tow')) {
          capabilityMismatch = 1;
        } else if (queryText.includes('charge') && !capabilityText.includes('charge')) {
          capabilityMismatch = 0.5; // partial mismatch
        }
      }

      return {
        ...prov,
        distance,
        eta,
        capabilityMismatch
      };
    });

    // Normalize distances and ETAs for scoring
    const maxDistance = Math.max(...rankedProviders.map((p) => p.distance)) || 1;
    const maxEta = Math.max(...rankedProviders.map((p) => p.eta)) || 1;

    const rankedWithScores = rankedProviders.map((prov) => {
      const normDist = prov.distance / maxDistance;
      const normEta = prov.eta / maxEta;
      const score = w1 * normDist + w2 * normEta + w4 * prov.capabilityMismatch;

      return {
        ...prov,
        score
      };
    });

    // Sort by lowest score
    rankedWithScores.sort((a, b) => a.score - b.score);
    const chosenProvider = rankedWithScores[0];

    // 3. Pricing Calculation
    // formula: estimatedCost = baseServiceFee + (distanceKm * perKmRate) + (isEmergencyHours ? emergencySurcharge : 0)
    const baseServiceFee = 299;
    const perKmRate = 18;
    const emergencySurcharge = 150;

    // Check emergency hours: 10 PM (22:00) to 6 AM (06:00)
    const hour = new Date().getHours();
    const isEmergencyHours = hour >= 22 || hour < 6;
    const cost = baseServiceFee + (chosenProvider.distance * perKmRate) + (isEmergencyHours ? emergencySurcharge : 0);
    const finalEstimatedCost = parseFloat(cost.toFixed(2));

    // 4. Create request and quotation
    const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
    const quoteId = 'quote_' + Math.random().toString(36).substr(2, 9);

    await dbRun(
      'INSERT INTO assistance_requests (id, user_id, provider_id, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)',
      [requestId, req.user?.id, chosenProvider.profile_id, latitude, longitude, 'requested']
    );

    await dbRun(
      'INSERT INTO quotes (id, request_id, estimated_distance, estimated_eta_minutes, estimated_cost) VALUES (?, ?, ?, ?, ?)',
      [quoteId, requestId, chosenProvider.distance, chosenProvider.eta, finalEstimatedCost]
    );

    // Audit logs
    await dbRun('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, ?, ?)', [
      'evt_' + Math.random().toString(36).substr(2, 9),
      requestId,
      'requested',
      req.user?.id
    ]);

    const finalRequest = {
      id: requestId,
      user_id: req.user?.id,
      provider_id: chosenProvider.profile_id,
      latitude,
      longitude,
      status: 'requested',
      created_at: new Date().toISOString(),
      quote: {
        id: quoteId,
        estimated_distance: chosenProvider.distance,
        estimated_eta_minutes: chosenProvider.eta,
        estimated_cost: finalEstimatedCost
      },
      provider: {
        id: chosenProvider.profile_id,
        name: chosenProvider.name,
        phone: chosenProvider.phone,
        vehicle_type: chosenProvider.vehicle_type,
        service_capability: chosenProvider.service_capability,
        license_plate: chosenProvider.license_plate,
        latitude: chosenProvider.latitude,
        longitude: chosenProvider.longitude
      }
    };

    // Broadcast the new request in real-time
    broadcastEvent('request_new', finalRequest);

    res.status(201).json(finalRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = await dbGet('SELECT * FROM assistance_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Assistance request not found' });

    const quote = await dbGet('SELECT * FROM quotes WHERE request_id = ?', [request.id]);
    const userProfile = await dbGet('SELECT * FROM profiles WHERE id = ?', [request.user_id]);
    const providerProfile = await dbGet('SELECT * FROM profiles WHERE id = ?', [request.provider_id]);
    const providerLocation = await dbGet('SELECT * FROM providers WHERE profile_id = ?', [request.provider_id]);

    res.json({
      ...request,
      quote,
      user: userProfile,
      provider: providerProfile ? {
        ...providerProfile,
        latitude: providerLocation?.latitude,
        longitude: providerLocation?.longitude
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = `
      SELECT r.id, r.user_id, r.provider_id, r.latitude, r.longitude, r.status, r.created_at,
             q.estimated_cost, q.estimated_distance, q.estimated_eta_minutes,
             u.name as user_name, u.phone as user_phone, u.ev_model, u.license_plate,
             p.name as provider_name, p.phone as provider_phone
      FROM assistance_requests r
      LEFT JOIN quotes q ON r.id = q.request_id
      LEFT JOIN profiles u ON r.user_id = u.id
      LEFT JOIN profiles p ON r.provider_id = p.id
    `;

    const params: any[] = [];
    if (req.user?.role === 'user') {
      query += ' WHERE r.user_id = ?';
      params.push(req.user.id);
    } else if (req.user?.role === 'provider') {
      query += ' WHERE r.provider_id = ?';
      params.push(req.user.id);
    }
    query += ' ORDER BY r.created_at DESC';

    const requests = await dbQuery(query, params);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const request = await dbGet('SELECT * FROM assistance_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await dbRun('UPDATE assistance_requests SET status = ? WHERE id = ?', [status, req.params.id]);
    await dbRun('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, ?, ?)', [
      'evt_' + Math.random().toString(36).substr(2, 9),
      req.params.id,
      status,
      req.user?.id
    ]);

    // Retrieve full updated request structure for push broadcast
    const updatedRequest = await dbGet(`
      SELECT r.id, r.user_id, r.provider_id, r.status, r.latitude, r.longitude,
             q.estimated_cost, q.estimated_distance, q.estimated_eta_minutes,
             u.name as user_name, u.phone as user_phone, u.ev_model, u.license_plate,
             p.name as provider_name, p.phone as provider_phone
      FROM assistance_requests r
      LEFT JOIN quotes q ON r.id = q.request_id
      LEFT JOIN profiles u ON r.user_id = u.id
      LEFT JOIN profiles p ON r.provider_id = p.id
      WHERE r.id = ?
    `, [req.params.id]);

    broadcastEvent('request_update', updatedRequest);
    res.json(updatedRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Completed Service Records & Ratings
app.post('/api/service-records', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { request_id, service_type, final_cost, notes, rating } = req.body;
  if (!request_id || !final_cost) {
    return res.status(400).json({ error: 'request_id and final_cost are required' });
  }

  try {
    const recordId = 'rec_' + Math.random().toString(36).substr(2, 9);
    await dbRun(
      'INSERT INTO service_records (id, request_id, service_type, final_cost, completion_time, notes, rating) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)',
      [recordId, request_id, service_type || 'EV Rescue', final_cost, notes || '', rating || null]
    );

    // Update main request status to completed
    await dbRun('UPDATE assistance_requests SET status = "completed" WHERE id = ?', [request_id]);
    await dbRun('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, "completed", ?)', [
      'evt_' + Math.random().toString(36).substr(2, 9),
      request_id,
      req.user?.id
    ]);

    const updatedRequest = await dbGet(`
      SELECT r.id, r.user_id, r.provider_id, r.status,
             u.name as user_name, p.name as provider_name
      FROM assistance_requests r
      LEFT JOIN profiles u ON r.user_id = u.id
      LEFT JOIN profiles p ON r.provider_id = p.id
      WHERE r.id = ?
    `, [request_id]);

    broadcastEvent('request_update', updatedRequest);
    res.json({ success: true, recordId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all service records (mainly for history pages / admin)
app.get('/api/service-records', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = `
      SELECT sr.*, r.user_id, r.provider_id,
             u.name as user_name, p.name as provider_name
      FROM service_records sr
      JOIN assistance_requests r ON sr.request_id = r.id
      JOIN profiles u ON r.user_id = u.id
      JOIN profiles p ON r.provider_id = p.id
    `;
    const params: any[] = [];
    if (req.user?.role === 'user') {
      query += ' WHERE r.user_id = ?';
      params.push(req.user.id);
    } else if (req.user?.role === 'provider') {
      query += ' WHERE r.provider_id = ?';
      params.push(req.user.id);
    }
    const records = await dbQuery(query, params);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin metrics endpoint
app.get('/api/admin/metrics', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const usersCount = await dbGet('SELECT COUNT(*) as count FROM profiles WHERE role = "user"');
    const providersCount = await dbGet('SELECT COUNT(*) as count FROM profiles WHERE role = "provider"');
    const activeRequests = await dbGet('SELECT COUNT(*) as count FROM assistance_requests WHERE status NOT IN ("completed", "cancelled")');
    const completedRequests = await dbGet('SELECT COUNT(*) as count FROM assistance_requests WHERE status = "completed"');
    const avgRating = await dbGet('SELECT AVG(rating) as avg FROM service_records WHERE rating IS NOT NULL');
    const revenue = await dbGet('SELECT SUM(final_cost) as total FROM service_records');

    res.json({
      users: usersCount.count,
      providers: providersCount.count,
      activeRequests: activeRequests.count,
      completedRequests: completedRequests.count,
      averageRating: avgRating.avg ? parseFloat(avgRating.avg.toFixed(1)) : 0,
      totalRevenue: revenue.total ? parseFloat(revenue.total.toFixed(2)) : 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Server-Sent Events (SSE) Real-Time Synchronization channel
app.get('/api/realtime', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  console.log(`SSE Client connected: ${clientId}. Total active clients: ${sseClients.length}`);

  // Send initial ping to keep-alive
  res.write(`event: ping\ndata: ${JSON.stringify({ active: true })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client.id !== clientId);
    console.log(`SSE Client disconnected: ${clientId}. Total active clients: ${sseClients.length}`);
  });
});

// Catch-all health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`GridVolt Backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
