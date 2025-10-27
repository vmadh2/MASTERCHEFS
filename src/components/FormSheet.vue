<template>
  <div class="form-page">
    <nav class="taskbar">
      <span class="app-title">HuddleUp</span>
    </nav>
    <div class="form-container">
      <!-- Use @submit.prevent on the form itself -->
      <form @submit.prevent="sendData">
        <h2>Create New Post</h2>
        <label>Event type:</label>
        <select v-model="eventType" required>
          <option value="" disabled>Select category</option>
          <option value="Favour">Favour</option>
          <option value="Activity">Activity</option>
          <option value="Announcement">Announcement</option>
        </select>

        <label>Name:</label>
        <input type="text" required v-model="authorName" placeholder="Enter your name:"/>

        <label>Contact:</label>
        <input type="email" required v-model="authorContact" placeholder="Enter your email in the format: ___@___.___"/>

        <label>Event Title:</label>
        <input type="text" required v-model="eventTitle" placeholder="Enter event title:"/>

        <label>Date and Time of Event:</label>
        <input type="datetime-local" required v-model="eventWhen"/>
        <small class="hint">Please use the date-time picker to the right →</small>

        <label>Event Description:</label>
        <textarea required v-model="description" rows="5" placeholder="Enter full details about the event:"></textarea>

        <router-link :to="{ name: 'home-board' }" class="post-btn back-btn" role="button" aria-label="Back to home">Back to Home</router-link>

        <!-- UPDATED: Changed from router-link to button type="submit" -->
        <button type="submit" class="post-btn" aria-label="Post">Post</button>
      </form>
    </div>
  </div>
</template>

<!-- UPDATED: Switched to Composition API with <script setup> -->
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter for navigation
import { addDoc } from 'firebase/firestore';
import { bubblesCollection, Timestamp } from '@/firebase.js'; // Assuming firebase.js exports these

// --- Reactive State using ref ---
const eventType = ref("");
const authorName = ref("");
const authorContact = ref("");
const eventTitle = ref("");
const eventWhen = ref("");
const description = ref("");

const router = useRouter(); // Get router instance

const sendData = async () => {
  // --- Email Validation ---
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(authorContact.value)) {
    alert('Please enter a valid email address.');
    // No throw needed here as button click won't navigate automatically
    return; // Stop execution if invalid
  }

  // --- Date/Time Validation ---
   if (!eventWhen.value) {
    alert('Please select a date and time for the event.');
    return; // Stop execution if date/time is missing
  }

  // --- User Token Logic (from snippet) ---
  // Note: For production with Firebase Auth, use auth.currentUser.uid instead of localStorage
  if (!localStorage.getItem("userToken")) {
    localStorage.setItem("userToken", crypto.randomUUID());
  }
  const userToken = localStorage.getItem("userToken");

  try {
    // --- Prepare Data (combining both versions) ---
    const newPost = {
      // Your original fields
      event_type: eventType.value,
      author_name: authorName.value,
      author_contact: authorContact.value,
      event_title: eventTitle.value,
      event_when: new Date(eventWhen.value), // Convert string to Date
      description: description.value,
      bubble_active: true, // Your default field
      event_attend: [authorName.value], // Your default field

      // Fields from snippet
      created_by: userToken,
      created_at: Timestamp.now(), // Use Firestore Timestamp (better than ISO string)
    };

    // --- Send to Firebase ---
    await addDoc(bubblesCollection, newPost);

    alert('Post successfully created!');

    // --- Clear Fields ---
    eventType.value = "";
    authorName.value = "";
    authorContact.value = "";
    eventTitle.value = "";
    eventWhen.value = "";
    description.value = "";

    // --- Navigate on Success ---
    router.push({ name: 'home-board' });

  } catch (error) {
    console.error("Error adding document: ", error);
    alert('Failed to send data. Please try again.');
    // Error is caught, user stays on the form page
  }
};
</script>

<style scoped>
/* Styles remain exactly the same as your input */
.taskbar {
  display: flex;
  align-items: center;
  justify-content: center; /* Centered title */
  background: #7fdbe7;
  padding: 16px 32px;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}
.app-title { font-size: 1.3em; font-weight: bold; color: #333; }
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
  position: relative; /* Needed for absolute positioning if any */
}
h2 { text-align: center; margin-bottom: 24px; font-size: 2em; }
label { color: #555; display: block; margin: 18px 0 8px 0; font-size: 1em; font-weight: bold; }
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
textarea { resize: vertical; min-height: 80px; font-size: 1.1em; }
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  text-decoration: none; /* Add this if using router-link */
}
.post-btn:hover { background: #2ba6b0; }
.back-btn { float: left; margin-top: 12px; }
.form-page {
  min-height: 100vh;
  background: url('../../images/formBackground.png') no-repeat center center fixed;
  background-size: cover;
  margin: 0;
  padding: 0;
}
.hint { font-size: 0.8rem; color: #777; margin-top: -4px; display: block; } /* Ensure hint displays correctly */
</style>
