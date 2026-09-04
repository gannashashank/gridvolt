"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGet = exports.dbRun = exports.dbQuery = void 0;
exports.hashPassword = hashPassword;
exports.initDb = initDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const dbPath = path_1.default.resolve(__dirname, 'gridvolt.db');
const db = new sqlite3_1.default.Database(dbPath);
// Helper to hash password
function hashPassword(password) {
    const salt = 'gridvolt_salt_123';
    return crypto_1.default.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}
// Promisified DB operations
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.dbQuery = dbQuery;
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID, changes: this.changes });
        });
    });
};
exports.dbRun = dbRun;
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.dbGet = dbGet;
async function initDb() {
    // Create tables in sequence
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      role TEXT CHECK(role IN ('user', 'provider', 'admin')),
      ev_model TEXT,
      license_plate TEXT,
      vehicle_type TEXT,
      service_capability TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(id) REFERENCES auth_users(id)
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      profile_id TEXT,
      availability BOOLEAN DEFAULT 1,
      latitude REAL,
      longitude REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(profile_id) REFERENCES profiles(id)
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS assistance_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      provider_id TEXT,
      latitude REAL,
      longitude REAL,
      is_for_self BOOLEAN DEFAULT 1,
      onsite_contact_name TEXT,
      onsite_contact_phone TEXT,
      service_type TEXT,
      status TEXT DEFAULT 'requested',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES profiles(id),
      FOREIGN KEY(provider_id) REFERENCES profiles(id)
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      estimated_distance REAL,
      estimated_eta_minutes INTEGER,
      estimated_cost REAL,
      FOREIGN KEY(request_id) REFERENCES assistance_requests(id)
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS request_events (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      status TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      actor_id TEXT,
      FOREIGN KEY(request_id) REFERENCES assistance_requests(id)
    )
  `);
    await (0, exports.dbRun)(`
    CREATE TABLE IF NOT EXISTS service_records (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      service_type TEXT,
      final_cost REAL,
      completion_time DATETIME,
      notes TEXT,
      rating INTEGER,
      FOREIGN KEY(request_id) REFERENCES assistance_requests(id)
    )
  `);
    // Safe runtime schema migration for existing SQLite database
    try {
        await (0, exports.dbRun)('ALTER TABLE assistance_requests ADD COLUMN is_for_self BOOLEAN DEFAULT 1');
    }
    catch (e) { }
    try {
        await (0, exports.dbRun)('ALTER TABLE assistance_requests ADD COLUMN onsite_contact_name TEXT');
    }
    catch (e) { }
    try {
        await (0, exports.dbRun)('ALTER TABLE assistance_requests ADD COLUMN onsite_contact_phone TEXT');
    }
    catch (e) { }
    try {
        await (0, exports.dbRun)('ALTER TABLE assistance_requests ADD COLUMN service_type TEXT');
    }
    catch (e) { }
    // Check if seeding is needed
    const userCount = await (0, exports.dbGet)('SELECT COUNT(*) as count FROM auth_users');
    if (userCount.count === 0) {
        console.log('Seeding SQLite database with initial prototype data...');
        await seedData();
    }
}
async function seedData() {
    const hash = hashPassword('password123');
    const adminId = 'admin-uuid-000000000000';
    const u1Id = 'user-uuid-000000000001';
    const u2Id = 'user-uuid-000000000002';
    const u3Id = 'user-uuid-000000000003';
    const p1Id = 'prov-uuid-000000000001';
    const p2Id = 'prov-uuid-000000000002';
    const p3Id = 'prov-uuid-000000000003';
    const p4Id = 'prov-uuid-000000000004';
    const p5Id = 'prov-uuid-000000000005';
    // Seed auth_users
    const authUsers = [
        [adminId, 'admin@gridvolt.app', hash, 'admin'],
        [u1Id, 'user1@gridvolt.app', hash, 'user'],
        [u2Id, 'user2@gridvolt.app', hash, 'user'],
        [u3Id, 'user3@gridvolt.app', hash, 'user'],
        [p1Id, 'provider1@gridvolt.app', hash, 'provider'],
        [p2Id, 'provider2@gridvolt.app', hash, 'provider'],
        [p3Id, 'provider3@gridvolt.app', hash, 'provider'],
        [p4Id, 'provider4@gridvolt.app', hash, 'provider'],
        [p5Id, 'provider5@gridvolt.app', hash, 'provider']
    ];
    for (const [id, email, pass, role] of authUsers) {
        await (0, exports.dbRun)('INSERT INTO auth_users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [id, email, pass, role]);
    }
    // Seed profiles
    const profiles = [
        [adminId, 'GridVolt Admin', '+91 9999999999', 'admin', null, null, null, null],
        [u1Id, 'Rajesh Kumar', '+91 9876543210', 'user', 'Tata Nexon EV', 'DL1CA1234', null, null],
        [u2Id, 'Amit Sharma', '+91 9876543211', 'user', 'MG ZS EV', 'MH02BD5678', null, null],
        [u3Id, 'Priya Patel', '+91 9876543212', 'user', 'Hyundai Kona EV', 'GJ01EF9012', null, null],
        [p1Id, 'Vijay Kumar', '+91 8765432100', 'provider', null, 'RJ27UA1111', 'van', 'Level 2 DC charging'],
        [p2Id, 'Sanjay Singh', '+91 8765432101', 'provider', null, 'RJ14UB2222', 'truck', 'Flatbed towing + AC charging'],
        [p3Id, 'Rajesh Yadav', '+91 8765432102', 'provider', null, 'DL3CA3333', 'mobile-charger', 'Level 3 CCS2 Fast Charge'],
        [p4Id, 'Ramesh Patel', '+91 8765432103', 'provider', null, 'MH12PB4444', 'van', 'Level 2 DC charging'],
        [p5Id, 'Anil Deshmukh', '+91 8765432104', 'provider', null, 'KA03DB5555', 'mobile-charger', 'Level 3 CCS2 Fast Charge']
    ];
    for (const [id, name, phone, role, ev, plate, vtype, cap] of profiles) {
        await (0, exports.dbRun)('INSERT INTO profiles (id, name, phone, role, ev_model, license_plate, vehicle_type, service_capability) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, name, phone, role, ev, plate, vtype, cap]);
    }
    // Seed providers (latitude and longitude)
    // Udaipur: 24.5854, 73.7125
    // Jaipur: 26.9124, 75.7873
    // Delhi: 28.6139, 77.2090
    // Pune: 18.5204, 73.8567
    // Bengaluru: 12.9716, 77.5946
    const providerLocations = [
        ['p1-id', p1Id, 1, 24.5854, 73.7125],
        ['p2-id', p2Id, 1, 26.9124, 75.7873],
        ['p3-id', p3Id, 1, 28.6139, 77.2090],
        ['p4-id', p4Id, 0, 18.5204, 73.8567], // Offline/Busy
        ['p5-id', p5Id, 1, 12.9716, 77.5946]
    ];
    for (const [id, prof_id, avail, lat, lng] of providerLocations) {
        await (0, exports.dbRun)('INSERT INTO providers (id, profile_id, availability, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [id, prof_id, avail, lat, lng]);
    }
    // Seed historical requests & service records
    const req1Id = 'req-uuid-000000000001';
    const req2Id = 'req-uuid-000000000002';
    // Request 1: Udaipur Rajesh Kumar EV breakdown, Vijay provider completes
    await (0, exports.dbRun)('INSERT INTO assistance_requests (id, user_id, provider_id, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)', [req1Id, u1Id, p1Id, 24.5800, 73.7100, 'completed']);
    await (0, exports.dbRun)('INSERT INTO quotes (id, request_id, estimated_distance, estimated_eta_minutes, estimated_cost) VALUES (?, ?, ?, ?, ?)', ['quote-1', req1Id, 5.2, 15, 392.6]); // Cost = 299 + 5.2 * 18 = ~392.6
    await (0, exports.dbRun)('INSERT INTO service_records (id, request_id, service_type, final_cost, completion_time, notes, rating) VALUES (?, ?, ?, ?, ?, ?, ?)', ['rec-1', req1Id, 'Level 2 DC charging', 392.6, '2026-08-23T15:30:00Z', 'Quick charge and polite provider. Saved my night!', 5]);
    // Request 2: Jaipur Amit EV breakdown, Sanjay towing completes
    await (0, exports.dbRun)('INSERT INTO assistance_requests (id, user_id, provider_id, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?)', [req2Id, u2Id, p2Id, 26.9000, 75.7800, 'completed']);
    await (0, exports.dbRun)('INSERT INTO quotes (id, request_id, estimated_distance, estimated_eta_minutes, estimated_cost) VALUES (?, ?, ?, ?, ?)', ['quote-2', req2Id, 12.5, 30, 674.0]); // Cost = 299 + 12.5 * 18 + 150 (night surcharge) = 674.0
    await (0, exports.dbRun)('INSERT INTO service_records (id, request_id, service_type, final_cost, completion_time, notes, rating) VALUES (?, ?, ?, ?, ?, ?, ?)', ['rec-2', req2Id, 'Flatbed towing + AC charging', 674.0, '2026-08-23T23:15:00Z', 'Towed my vehicle to the nearest charging station. Reliable service.', 4]);
    console.log('Seeding completed successfully.');
}
