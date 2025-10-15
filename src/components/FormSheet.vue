<template>
  <div>
    <nav class="taskbar">
      <span class="app-title">Office Favours</span>
    </nav>
    <div class="form-container">
      <form @submit.prevent="sendData">
        <h2>Create New Post</h2>
        <label>Event type:</label>
        <select v-model="eventType" required>
          <option value="" disabled>Select category</option>
          <option value="Favour">Favour - Ask for Something</option>
          <option value="Question">Question - Ask a Question</option>
          <option value="Announcement">Announcement - Make an Announcement</option>
        </select>

        <label>Name:</label>
        <input type="text" required v-model="authorName" />

        <label>Contact:</label>
        <input type="email" required v-model="authorContact" />

        <label>Event Title:</label>
        <input type="text" required v-model="eventTitle" />

        <label>Date and Time of Event:</label>
        <input type="datetime-local" required v-model="eventWhen" />

        <label>Event Description:</label>
        <textarea required v-model="description" rows="5" placeholder="Enter full details about the event..."></textarea>

        <!-- added: Back to Home button (left) -->
        <router-link :to="{ name: 'home-board' }" class="post-btn back-btn" role="button" aria-label="Back to home">Back to Home</router-link>

        <router-link :to="{ name: 'home-board' }" class="post-btn" role="button" aria-label="Post" @click.prevent="sendData().then(() => $router.push({ name: 'home-board' })).catch(() => {})">Post</router-link>
      </form>
    </div>
  </div>
</template>

<script>
import { addDoc, Timestamp, collection } from 'firebase/firestore';
import { db } from '../firebase.js';

export default {
  data() {
    return {
      eventType: '',
      authorName: '',
      authorContact: '',
      eventTitle: '',
      eventWhen: '',
      description: ''
    };
  },
  methods: {
    async sendData() {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Validation is correct and blocks navigation by throwing an error
      if (!emailPattern.test(this.authorContact)) {
        alert('Please enter a valid email address.');
        throw new Error('Validation failed');
      }

      try {
        // --- PREPARE THE DATA with all required fields ---
        const newPost = {
          event_type: this.eventType,
          author_name: this.authorName,
          author_contact: this.authorContact,
          event_title: this.eventTitle,
          event_when: new Date(this.eventWhen), // Converts the string to a Date object
          description: this.description,

          // --- Add default fields required by the app/database ---
          bubble_active: true,
          bubble_created: Timestamp.now(), // Uses imported Timestamp
          event_attend: [this.authorName]
        };

        // --- Use imported addDoc and bubblesCollection ---
        await addDoc(collection(db, 'bubbles'), newPost);

        alert('Data sent to Firebase Firestore!');

        // Clear fields on success
        this.eventType = '';
        this.authorName = '';
        this.authorContact = '';
        this.eventTitle = '';
        this.eventWhen = '';
        this.description = '';

      } catch (err) {
        // Re-throwing the error ensures the promise rejects, preventing navigation.
        alert('Failed to send data.');
        throw err;
      }
    }
  }
}
</script>

<style>
.taskbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #7fdbe7;
  padding: 16px 32px;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}

.app-title {
  font-size: 1.3em;
  font-weight: bold;
  color: #333;
}

.make-post-btn {
  background: #3ec6d0;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  margin-right: 16px;
}

.profile-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
}

.form-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  margin: 40px;
}

form {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 32px 32px 24px 32px;
  max-width: 700px;
  width: 100%;
  text-align: left;
  position: relative;
}

h2 {
  text-align: center;
  margin-bottom: 24px;
  font-size: 2em;
}

label {
  color: #555;
  display: block;
  margin: 18px 0 8px 0;
  font-size: 1em;
  font-weight: bold;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid #ccc;
  font-size: 1em;
  box-sizing: border-box;
  background: #f7f7f7;
}

textarea {
  resize: vertical;
  min-height: 80px;
  font-size: 1.1em;
}

.post-btn {
  background: #3ec6d0;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 32px;
  font-size: 1.2em;
  font-weight: bold;
  cursor: pointer;
  float: right;
  margin-top: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  transition: background 0.2s;

  /* center the button text */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.post-btn:hover {
  background: #2ba6b0;
}

/* added: mirror Post button style but align left */
.back-btn {
  float: left;
  margin-top: 12px;
}

body, html {
  margin: 0;
  padding: 0;
  background: url('../../images/formBackground.png') no-repeat center center fixed;
  background-size: cover;
}
</style>
