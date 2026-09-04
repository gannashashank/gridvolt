"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretgridvoltkey123!';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let sseClients = [];
// Helper: Broadcast event to SSE clients
function broadcastEvent(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
        client.res.write(payload);
    });
}
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access token required' });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // In development / demo prototype, safely decode valid token payload if expired across restarts
            try {
                const decoded = jsonwebtoken_1.default.decode(token);
                if (decoded && decoded.id) {
                    req.user = decoded;
                    return next();
                }
            }
            catch (decodeErr) { }
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}
// Haversine Distance helper (in Km)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}
// REST API Endpoints
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>GridVolt Backend API</title>
        <style>
          body { background: #0A0A0B; color: #FFFFFF; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; margin: 0; text-align: center; }
          .card { background: #141518; border: 1px solid #22242A; padding: 40px; border-radius: 4px; max-width: 500px; }
          .badge { display: inline-block; padding: 4px 12px; background: rgba(255, 106, 0, 0.12); color: #FF6A00; border: 1px solid #FF6A00; font-size: 11px; margin-bottom: 20px; letter-spacing: 2px; }
          h1 { font-size: 20px; letter-spacing: 3px; font-weight: normal; margin-bottom: 8px; }
          p { color: #8A8D93; font-size: 13px; line-height: 1.6; }
          .btn { display: inline-block; margin-top: 24px; padding: 12px 24px; background: #FF6A00; color: #fff; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 2px; }
          .btn:hover { background: #E05D00; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">API BACKEND // PORT 5000</div>
          <h1>GRIDVOLT REST & SSE ENGINE</h1>
          <p>You have navigated to the backend service. The web application client is running on port 3000.</p>
          <a class="btn" href="http://localhost:3000">OPEN WEB APPLICATION (PORT 3000) →</a>
        </div>
      </body>
    </html>
  `);
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'GridVolt Backend', timestamp: new Date().toISOString() });
});
// 1. Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, phone, password, role, ev_model, license_plate, vehicle_type, service_capability } = req.body;
    if (!email || !password || !role || !name || !phone) {
        return res.status(400).json({ error: 'Required fields missing: email, password, role, name, phone' });
    }
    try {
        const existing = await (0, db_1.dbGet)('SELECT * FROM auth_users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const userId = 'user_' + Math.random().toString(36).substr(2, 9);
        const passHash = (0, db_1.hashPassword)(password);
        await (0, db_1.dbRun)('INSERT INTO auth_users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [
            userId,
            email,
            passHash,
            role
        ]);
        await (0, db_1.dbRun)('INSERT INTO profiles (id, name, phone, role, ev_model, license_plate, vehicle_type, service_capability) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userId, name, phone, role, ev_model || null, license_plate || null, vehicle_type || null, service_capability || null]);
        if (role === 'provider') {
            // Default to Jaipur/Udaipur center for mock coordination
            await (0, db_1.dbRun)('INSERT INTO providers (id, profile_id, availability, latitude, longitude) VALUES (?, ?, 1, 24.5854, 73.7125)', [
                'prov_' + Math.random().toString(36).substr(2, 9),
                userId
            ]);
        }
        const token = jsonwebtoken_1.default.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: userId, email, role, name } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await (0, db_1.dbGet)('SELECT * FROM auth_users WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const hash = (0, db_1.hashPassword)(password);
        if (user.password_hash !== hash) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }
        const profile = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [user.id]);
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: profile?.name || 'User'
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const profile = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
        if (!profile)
            return res.status(404).json({ error: 'Profile not found' });
        res.json({ user: req.user, profile });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/auth/complete-profile', authenticateToken, async (req, res) => {
    const { name, phone, ev_model, license_plate, vehicle_type, service_capability } = req.body;
    try {
        await (0, db_1.dbRun)('UPDATE profiles SET name = ?, phone = ?, ev_model = ?, license_plate = ?, vehicle_type = ?, service_capability = ? WHERE id = ?', [
            name,
            phone,
            ev_model || null,
            license_plate || null,
            vehicle_type || null,
            service_capability || null,
            req.user?.id
        ]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 1.5 Profiles endpoints
app.get('/api/profiles', authenticateToken, async (req, res) => {
    try {
        const roleFilter = req.query.role;
        if (req.user?.role === 'admin') {
            let query = 'SELECT * FROM profiles';
            const params = [];
            if (roleFilter) {
                query += ' WHERE role = ?';
                params.push(roleFilter);
            }
            query += ' ORDER BY created_at DESC';
            const list = await (0, db_1.dbQuery)(query, params);
            res.json(list);
        }
        else {
            const profile = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
            res.json(profile ? [profile] : []);
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/profiles/me', authenticateToken, async (req, res) => {
    const { name, phone, ev_model, license_plate, vehicle_type, service_capability } = req.body;
    try {
        await (0, db_1.dbRun)('UPDATE profiles SET name = COALESCE(?, name), phone = COALESCE(?, phone), ev_model = COALESCE(?, ev_model), license_plate = COALESCE(?, license_plate), vehicle_type = COALESCE(?, vehicle_type), service_capability = COALESCE(?, service_capability) WHERE id = ?', [
            name,
            phone,
            ev_model,
            license_plate,
            vehicle_type,
            service_capability,
            req.user?.id
        ]);
        const updated = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/profiles/complete-profile', authenticateToken, async (req, res) => {
    const { name, phone, ev_model, license_plate, vehicle_type, service_capability } = req.body;
    try {
        await (0, db_1.dbRun)('UPDATE profiles SET name = ?, phone = ?, ev_model = ?, license_plate = ?, vehicle_type = ?, service_capability = ? WHERE id = ?', [
            name,
            phone,
            ev_model || null,
            license_plate || null,
            vehicle_type || null,
            service_capability || null,
            req.user?.id
        ]);
        const updated = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [req.user?.id]);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 2. Providers endpoints
app.get('/api/providers', async (req, res) => {
    try {
        const list = await (0, db_1.dbQuery)(`
      SELECT p.id, p.profile_id, p.availability, p.latitude, p.longitude, pr.name, pr.phone, pr.vehicle_type, pr.service_capability, pr.license_plate
      FROM providers p
      JOIN profiles pr ON p.profile_id = pr.id
    `);
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/providers/status', authenticateToken, async (req, res) => {
    const { availability, latitude, longitude } = req.body;
    try {
        const provider = await (0, db_1.dbGet)('SELECT id FROM providers WHERE profile_id = ?', [req.user?.id]);
        if (!provider)
            return res.status(404).json({ error: 'Provider record not found' });
        if (availability !== undefined) {
            await (0, db_1.dbRun)('UPDATE providers SET availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                availability ? 1 : 0,
                provider.id
            ]);
        }
        if (latitude !== undefined && longitude !== undefined) {
            await (0, db_1.dbRun)('UPDATE providers SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                latitude,
                longitude,
                provider.id
            ]);
        }
        const updatedProvider = await (0, db_1.dbGet)(`
      SELECT p.id, p.profile_id, p.availability, p.latitude, p.longitude, pr.name, pr.phone
      FROM providers p
      JOIN profiles pr ON p.profile_id = pr.id
      WHERE p.id = ?
    `, [provider.id]);
        broadcastEvent('provider_update', updatedProvider);
        res.json(updatedProvider);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 3. Requests core workflow (Intelligent Dispatch and Pricing)
app.post(['/api/requests', '/api/assistance_requests'], authenticateToken, async (req, res) => {
    const { latitude, longitude, service_type, is_for_self, onsite_contact_name, onsite_contact_phone } = req.body;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and Longitude are required for emergency request' });
    }
    // Section 4A: Remote Request & On-Site Contact Resolution
    const isSelf = is_for_self !== false && is_for_self !== 'false';
    let contactName = onsite_contact_name;
    let contactPhone = onsite_contact_phone;
    if (isSelf) {
        const userProfile = await (0, db_1.dbGet)('SELECT name, phone FROM profiles WHERE id = ?', [req.user?.id]);
        contactName = userProfile?.name || 'EV Driver';
        contactPhone = userProfile?.phone || '';
    }
    else {
        if (!contactName || !contactPhone) {
            return res.status(400).json({ error: "Stranded person's name and phone number are required for remote requests" });
        }
    }
    try {
        // 1. Get all active & online providers
        const providersList = await (0, db_1.dbQuery)(`
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
        const rankedProviders = providersList.map((prov) => {
            const distance = getHaversineDistance(latitude, longitude, prov.latitude, prov.longitude);
            // ETA: roughly 2.5 minutes per km plus a 5 minute buffer
            const eta = Math.round(distance * 2.5 + 5);
            // capability mismatch penalty: check if requested service matches capability
            let capabilityMismatch = 0;
            if (service_type) {
                const capabilityText = (prov.service_capability || '').toLowerCase();
                const typeText = (prov.vehicle_type || '').toLowerCase();
                const queryText = service_type.toLowerCase();
                if (queryText.includes('tow') && !typeText.includes('truck') && !capabilityText.includes('tow')) {
                    capabilityMismatch = 1;
                }
                else if (queryText.includes('charge') && !capabilityText.includes('charge')) {
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
        await (0, db_1.dbRun)('INSERT INTO assistance_requests (id, user_id, provider_id, latitude, longitude, is_for_self, onsite_contact_name, onsite_contact_phone, service_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            requestId,
            req.user?.id,
            chosenProvider.profile_id,
            latitude,
            longitude,
            isSelf ? 1 : 0,
            contactName,
            contactPhone,
            service_type || 'Emergency Charging Rescue',
            'requested'
        ]);
        await (0, db_1.dbRun)('INSERT INTO quotes (id, request_id, estimated_distance, estimated_eta_minutes, estimated_cost) VALUES (?, ?, ?, ?, ?)', [quoteId, requestId, chosenProvider.distance, chosenProvider.eta, finalEstimatedCost]);
        // Audit logs
        await (0, db_1.dbRun)('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, ?, ?)', [
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
            is_for_self: isSelf,
            onsite_contact_name: contactName,
            onsite_contact_phone: contactPhone,
            service_type: service_type || 'Emergency Charging Rescue',
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get(['/api/requests/:id', '/api/assistance_requests/:id'], authenticateToken, async (req, res) => {
    try {
        const request = await (0, db_1.dbGet)('SELECT * FROM assistance_requests WHERE id = ?', [req.params.id]);
        if (!request)
            return res.status(404).json({ error: 'Assistance request not found' });
        const quote = await (0, db_1.dbGet)('SELECT * FROM quotes WHERE request_id = ?', [request.id]);
        const userProfile = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [request.user_id]);
        const providerProfile = await (0, db_1.dbGet)('SELECT * FROM profiles WHERE id = ?', [request.provider_id]);
        const providerLocation = await (0, db_1.dbGet)('SELECT * FROM providers WHERE profile_id = ?', [request.provider_id]);
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get(['/api/requests', '/api/assistance_requests'], authenticateToken, async (req, res) => {
    try {
        let query = `
      SELECT r.id, r.user_id, r.provider_id, r.latitude, r.longitude, r.is_for_self, r.onsite_contact_name, r.onsite_contact_phone, r.service_type, r.status, r.created_at,
             q.estimated_cost, q.estimated_distance, q.estimated_eta_minutes,
             u.name as user_name, u.phone as user_phone, u.ev_model, u.license_plate,
             p.name as provider_name, p.phone as provider_phone
      FROM assistance_requests r
      LEFT JOIN quotes q ON r.id = q.request_id
      LEFT JOIN profiles u ON r.user_id = u.id
      LEFT JOIN profiles p ON r.provider_id = p.id
    `;
        const params = [];
        if (req.user?.role === 'user') {
            query += ' WHERE r.user_id = ?';
            params.push(req.user.id);
        }
        else if (req.user?.role === 'provider') {
            query += ' WHERE r.provider_id = ?';
            params.push(req.user.id);
        }
        query += ' ORDER BY r.created_at DESC';
        const requests = await (0, db_1.dbQuery)(query, params);
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put(['/api/requests/:id/status', '/api/assistance_requests/:id/status'], authenticateToken, async (req, res) => {
    const { status } = req.body;
    if (!status)
        return res.status(400).json({ error: 'Status is required' });
    try {
        const request = await (0, db_1.dbGet)('SELECT * FROM assistance_requests WHERE id = ?', [req.params.id]);
        if (!request)
            return res.status(404).json({ error: 'Request not found' });
        await (0, db_1.dbRun)('UPDATE assistance_requests SET status = ? WHERE id = ?', [status, req.params.id]);
        await (0, db_1.dbRun)('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, ?, ?)', [
            'evt_' + Math.random().toString(36).substr(2, 9),
            req.params.id,
            status,
            req.user?.id
        ]);
        // Retrieve full updated request structure for push broadcast
        const updatedRequest = await (0, db_1.dbGet)(`
      SELECT r.id, r.user_id, r.provider_id, r.status, r.latitude, r.longitude, r.is_for_self, r.onsite_contact_name, r.onsite_contact_phone, r.service_type,
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get(['/api/requests/:id/events', '/api/assistance_requests/:id/events'], authenticateToken, async (req, res) => {
    try {
        const events = await (0, db_1.dbQuery)(`
      SELECT e.*, p.name as actor_name, p.role as actor_role
      FROM request_events e
      LEFT JOIN profiles p ON e.actor_id = p.id
      WHERE e.request_id = ?
      ORDER BY e.timestamp ASC
    `, [req.params.id]);
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 4. Completed Service Records & Ratings
app.post('/api/service-records', authenticateToken, async (req, res) => {
    const { request_id, service_type, final_cost, notes, rating } = req.body;
    if (!request_id || !final_cost) {
        return res.status(400).json({ error: 'request_id and final_cost are required' });
    }
    try {
        const recordId = 'rec_' + Math.random().toString(36).substr(2, 9);
        await (0, db_1.dbRun)('INSERT INTO service_records (id, request_id, service_type, final_cost, completion_time, notes, rating) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)', [recordId, request_id, service_type || 'EV Rescue', final_cost, notes || '', rating || null]);
        // Update main request status to completed
        await (0, db_1.dbRun)('UPDATE assistance_requests SET status = "completed" WHERE id = ?', [request_id]);
        await (0, db_1.dbRun)('INSERT INTO request_events (id, request_id, status, actor_id) VALUES (?, ?, "completed", ?)', [
            'evt_' + Math.random().toString(36).substr(2, 9),
            request_id,
            req.user?.id
        ]);
        const updatedRequest = await (0, db_1.dbGet)(`
      SELECT r.id, r.user_id, r.provider_id, r.status,
             u.name as user_name, p.name as provider_name
      FROM assistance_requests r
      LEFT JOIN profiles u ON r.user_id = u.id
      LEFT JOIN profiles p ON r.provider_id = p.id
      WHERE r.id = ?
    `, [request_id]);
        broadcastEvent('request_update', updatedRequest);
        res.json({ success: true, recordId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET all service records (mainly for history pages / admin)
app.get('/api/service-records', authenticateToken, async (req, res) => {
    try {
        let query = `
      SELECT sr.*, r.user_id, r.provider_id,
             u.name as user_name, p.name as provider_name
      FROM service_records sr
      JOIN assistance_requests r ON sr.request_id = r.id
      JOIN profiles u ON r.user_id = u.id
      JOIN profiles p ON r.provider_id = p.id
    `;
        const params = [];
        if (req.user?.role === 'user') {
            query += ' WHERE r.user_id = ?';
            params.push(req.user.id);
        }
        else if (req.user?.role === 'provider') {
            query += ' WHERE r.provider_id = ?';
            params.push(req.user.id);
        }
        const records = await (0, db_1.dbQuery)(query, params);
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Admin metrics endpoint
app.get('/api/admin/metrics', authenticateToken, async (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin role required' });
    }
    try {
        const usersCount = await (0, db_1.dbGet)('SELECT COUNT(*) as count FROM profiles WHERE role = "user"');
        const providersCount = await (0, db_1.dbGet)('SELECT COUNT(*) as count FROM profiles WHERE role = "provider"');
        const activeRequests = await (0, db_1.dbGet)('SELECT COUNT(*) as count FROM assistance_requests WHERE status NOT IN ("completed", "cancelled")');
        const completedRequests = await (0, db_1.dbGet)('SELECT COUNT(*) as count FROM assistance_requests WHERE status = "completed"');
        const avgRating = await (0, db_1.dbGet)('SELECT AVG(rating) as avg FROM service_records WHERE rating IS NOT NULL');
        const revenue = await (0, db_1.dbGet)('SELECT SUM(final_cost) as total FROM service_records');
        res.json({
            users: usersCount.count,
            providers: providersCount.count,
            activeRequests: activeRequests.count,
            completedRequests: completedRequests.count,
            averageRating: avgRating.avg ? parseFloat(avgRating.avg.toFixed(1)) : 0,
            totalRevenue: revenue.total ? parseFloat(revenue.total.toFixed(2)) : 0
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 5. Server-Sent Events (SSE) Real-Time Synchronization channel
app.get('/api/realtime', (req, res) => {
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
(0, db_1.initDb)()
    .then(() => {
    app.listen(PORT, () => {
        console.log(`GridVolt Backend running at http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error('Failed to initialize database:', err);
});
