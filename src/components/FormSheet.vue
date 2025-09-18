<template>
  <div>
    <nav class="taskbar">
      <span class="app-title">Office Favours</span>
      <img class="profile-img" src="../../images/profilePhoto.png" alt="Profile" />
    </nav>
    <div class="form-container">
      <form @submit.prevent="sendData">
        <h2>Create New Post</h2>
        <label>Category:</label>
        <select v-model="category" required>
          <option value="" disabled>Select category</option>
          <option value="Favour">Favour</option>
          <option value="Question">Question</option>
          <option value="Announcement">Announcement</option>
        </select>

        <label>Name:</label>
        <input type="text" required v-model="name" />

        <label>Email:</label>
        <input type="email" required v-model="email" />

        <label>Content:</label>
        <textarea required v-model="message" rows="5" placeholder="Enter your message"></textarea>

        <button type="submit" class="post-btn">Post</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      category: '',
      name: '',
      email: '',
      message: ''
    };
  },
  methods: {
    async sendData() {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(this.email)) {
        alert('Please enter a valid email address.');
        return;
      }
      try {
        await fetch('http://localhost:3000/api/send-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: this.category,
            name: this.name,
            email: this.email,
            message: this.message
          })
        });
        alert('Data sent!');
        this.category = '';
        this.name = '';
        this.email = '';
        this.message = '';
      } catch (err) {
        alert('Failed to send data.');
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
}

.post-btn:hover {
  background: #2ba6b0;
}

body, html {
  margin: 0;
  padding: 0;
  background: url('../../images/formBackground.png') no-repeat center center fixed;
  background-size: cover;
}
</style>