import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import { readFileSync } from 'fs';

const app = express();
app.use(express.json());
app.use(cors());

// Load service account key
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.post('/api/send-data', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await db.collection('formSubmissions').add({
      name,
      email,
      message,
      timestamp: new Date()
    });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send('Error saving data');
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));