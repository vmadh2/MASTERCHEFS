const admin = require('firebase-admin');

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY
} = process.env;

// basic env check
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('Missing Firebase env vars. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set.');
  process.exit(1);
}

// convert escaped \n sequences into real newlines
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  const serviceAccount = {
    project_id: FIREBASE_PROJECT_ID,
    client_email: FIREBASE_CLIENT_EMAIL,
    private_key: privateKey
  };
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getFirstFive() {
  try {
    // Use 'formSubmission' or 'formSubmissions' depending on your DB
    const coll = db.collection('formSubmission');

    // If you have a timestamp field, order by it for deterministic results:
    const snapshot = await coll
      .orderBy('timestamp', 'desc') // remove this line if no timestamp exists
      .limit(5)
      .get();

    const items = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    return items;
  } catch (err) {
    console.error('Error fetching first 5 documents:', err);
    throw err;
  }
}

// run when executed directly
if (require.main === module) {
  getFirstFive()
    .then(items => console.log('First 5:', items))
    .catch(() => process.exit(1));
}

module.exports = { getFirstFive };


