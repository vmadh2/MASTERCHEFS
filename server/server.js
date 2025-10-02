import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Ensure dotenv loads the .env at the repository root (one level above server/).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// If dotenv didn't inject expected vars (some editors save multiline values which dotenv can't parse),
// try a resilient fallback: read the .env file and extract values manually (handles multiline private key blocks).
function loadEnvFallback() {
  const envPath = join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');

  // project id and client email (simple single-line values)
  const pidMatch = text.match(/^FIREBASE_PROJECT_ID=(.*)$/m);
  const emailMatch = text.match(/^FIREBASE_CLIENT_EMAIL=(.*)$/m);
  if (pidMatch && !process.env.FIREBASE_PROJECT_ID) process.env.FIREBASE_PROJECT_ID = pidMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (emailMatch && !process.env.FIREBASE_CLIENT_EMAIL) process.env.FIREBASE_CLIENT_EMAIL = emailMatch[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');

  // FIREBASE_PRIVATE_KEY may be encoded as a single quoted line with \n sequences OR as a multiline block.
  const keyIndex = text.indexOf('FIREBASE_PRIVATE_KEY=');
  if (keyIndex === -1) return;

  let rest = text.slice(keyIndex + 'FIREBASE_PRIVATE_KEY='.length);
  let extracted = '';

  // If it starts with a quote, try to find a matching closing quote on same line or later.
  if (rest[0] === '"' || rest[0] === "'") {
    const quote = rest[0];
    rest = rest.slice(1);
    // Look for closing quote
    const closeIdx = rest.indexOf(quote);
    if (closeIdx !== -1) {
      extracted = rest.slice(0, closeIdx);
    } else {
      // No closing quote: perhaps the key is multiline. Try to capture until END PRIVATE KEY marker.
      const endMarker = '-----END PRIVATE KEY-----';
      const endIdx = rest.indexOf(endMarker);
      if (endIdx !== -1) {
        extracted = rest.slice(0, endIdx + endMarker.length);
      } else {
        // fallback: take the rest of file
        extracted = rest;
      }
    }
  } else {
    // Unquoted single-line value - take until newline
    const nl = rest.indexOf('\n');
    if (nl !== -1) extracted = rest.slice(0, nl); else extracted = rest;
  }

  // Trim and normalize: if it contains literal \n sequences, convert them to real newlines; otherwise keep literal newlines.
  extracted = extracted.trim();
  const normalized = extracted.includes('\\n') ? extracted.replace(/\\n/g, '\n') : extracted;
  if (!process.env.FIREBASE_PRIVATE_KEY) process.env.FIREBASE_PRIVATE_KEY = normalized;
}

loadEnvFallback();

const app = express();
app.use(express.json());
app.use(cors());

let serviceAccount = null;

// Read raw env values
const pid = process.env.FIREBASE_PROJECT_ID;
const email = process.env.FIREBASE_CLIENT_EMAIL;
let rawPk = process.env.FIREBASE_PRIVATE_KEY || '';

// dotenv and different editors sometimes wrap values in quotes or leave literal newlines.
// Normalize: strip surrounding single/double quotes, then convert escaped \n into real newlines.
if (rawPk.startsWith('"') && rawPk.endsWith('"')) {
  rawPk = rawPk.slice(1, -1);
} else if (rawPk.startsWith("'") && rawPk.endsWith("'")) {
  rawPk = rawPk.slice(1, -1);
}

const pk = rawPk.includes('\\n') ? rawPk.replace(/\\n/g, '\n') : rawPk;

let db = null;

// using the raw env files
const pidUsed = pid || PLACEHOLDER_PID;
const emailUsed = email || PLACEHOLDER_EMAIL;
const pkUsed = (pk && pk.length > 10) ? pk : PLACEHOLDER_PRIVATE_KEY.replace(/\\n/g, '\\n');

serviceAccount = {
  type: 'service_account',
  project_id: pidUsed,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || undefined,
  private_key: pkUsed.includes('\\n') ? pkUsed.replace(/\\n/g, '\n') : pkUsed,
  client_email: emailUsed,
  client_id: process.env.FIREBASE_CLIENT_ID || undefined,
};

// Try to initialize Firebase admin — if credentials are placeholders or invalid this may fail.
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log('Firebase Admin initialized.');
} catch (err) {
  console.warn('Firebase Admin failed to initialize (placeholders may be in use). Replace credentials in .env to enable Firestore access.');
  console.warn(err && err.message ? err.message : err);
  db = null; // keep server running; endpoints will report 503 when Firestore isn't available
}

// API: return first five bubbles from 'bubbles' collection ordered by bubble_created desc
app.get('/api/first-five', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Firestore not initialized. Replace Firebase placeholders in .env with real credentials.' });
    }

    const coll = db.collection('bubbles');
    let q = coll.orderBy('bubble_created', 'desc').limit(5);
    const snapshot = await q.get();
    const items = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      items.push({
        id: doc.id,
        title: d.title || d.name || d.text || null,
        event_type: d.event_type || d.type || null,
        bubble_created: d.bubble_created || d.timestamp || null,
        // include event-specific fields if present
        event_title: d.event_title || d.eventName || d.title || d.name || null,
        event_when: d.event_when || d.when || d.date || d.bubble_created || null,
        x: d.x || null,
        y: d.y || null,
        size: d.size || null,
        color: d.color || null,
        raw: d
      });
    });
    res.json(items);
  } catch (err) {
    console.error('Error in /api/first-five:', err);
    res.status(500).json({ error: 'Failed to fetch first five bubbles' });
  }
});

app.post('/api/send-data', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    if (!db) return res.status(503).send('Firestore not initialized. Replace Firebase placeholders in .env with real credentials.');

    await db.collection('formSubmissions').add({
      name,
      email,
      message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.sendStatus(200);
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).send('Error saving data');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));