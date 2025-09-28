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

if (!pid || !email || !pk) {
  console.error('Firebase credentials missing. Please set the following in your .env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  console.error('Note: FIREBASE_PRIVATE_KEY must be the full key with escaped\\n sequences (no raw multiline value) or properly quoted.');
  process.exit(1);
}

serviceAccount = {
  type: 'service_account',
  project_id: pid,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || undefined,
  private_key: pk,
  client_email: email,
  client_id: process.env.FIREBASE_CLIENT_ID || undefined,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// API: return first five documents from 'formSubmission' collection
app.get('/api/first-five', async (req, res) => {
  try {
    const coll = db.collection('formSubmission');
    let query = coll.limit(5);
    // prefer ordering by timestamp if available
    try {
      query = coll.orderBy('timestamp', 'desc').limit(5);
    } catch (e) {
      // collection may not have timestamp field or index; fall back to unordered limit
      query = coll.limit(5);
    }
    const snapshot = await query.get();
    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    console.error('Error in /api/first-five:', err);
    res.status(500).json({ error: 'Failed to fetch first five documents' });
  }
});

app.post('/api/send-data', async (req, res) => {
  const { name, email, message } = req.body;
  try {
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