<template>
  <!-- Top bar (fixed) matching provided design -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-title">"THE INTERACTIVE BULLETIN"</div>
      <router-link
        :to="{ name: 'form-sheet' }"
        class="login-btn"
        role="button"
        aria-label="Open form sheet"
        style="display:flex;align-items:center;justify-content:center"
      >
      Post
      </router-link>
    </div>
  </header>

  <section class="hero is-light">
    <div class="hero-body is-align-items-center">
      <div class="container has-text-centered stretch" style="width:100%;">
        <div class="bubble-container" ref="bubbleContainer">
          <!-- Only show content when data is loaded to prevent background flicker -->
          <template v-if="isDataLoaded">
            <!-- Show liked bubbles if any exist -->
            <div
              v-for="(bubble, index) in likedBubblesForDisplay"
              :key="bubble.id"
              class="bubble"
              :class="bubble.colorClass"
              :style="bubbleStyle(bubble, index)"
              @click="selectBubble(bubble)"
            >
              <p>{{ bubble.event_name }}</p>
              <!-- Heart indicator -->
              <div class="heart-indicator">❤️</div>
            </div>

            <!-- Show message if no liked bubbles (only after data loads) -->
            <div v-if="likedBubblesForDisplay.length === 0" class="no-likes-message">
              <h2>No Liked Bubbles Yet! 💔</h2>
              <p>Go to the Public board and like some bubbles to see them here.</p>
              <router-link :to="{ name: 'home-board' }" class="go-public-btn">
                Go to Public Board
              </router-link>
            </div>
          </template>
          
          <!-- Loading state -->
          <div v-else class="loading-message">
            <p>Loading your liked bubbles...</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bubble Details Modal -->
  <div v-if="selectedBubble" class="bubble-modal" @click.self="selectedBubble = null">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ selectedBubble.event_name }}</h3>
        <button @click="selectedBubble = null" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Time:</strong> {{ formatTime(selectedBubble.event_time) }}</p>
        <p><strong>Type:</strong> {{ getBubbleType(selectedBubble) }}</p>
        <div class="liked-indicator">
          <span>❤️ Liked Bubble</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom bar (fixed) - FIXED TOGGLE POSITIONING -->
  <footer class="bottombar">
    <div class="bottombar-inner">
      <div class="bottombar-left">Public</div>

      <router-link
        :to="{ name: 'home-board' }"
        class="bottombar-toggle toggle-track private-state"
        role="switch"
        aria-checked="true"
        tabindex="0"
        aria-label="Toggle visibility between Public and Private"
      >
        <div class="toggle-thumb private-thumb"></div>
      </router-link>

      <div class="bottombar-right">Private</div>
    </div>
  </footer>
</template>

<script>
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

export default {
  name: 'PrivateBoard',
  data() {
    return {
      likedBubbles: new Set(),
      allBubblesData: [],
      selectedBubble: null,
      containerWidth: 0,
      containerHeight: 0,
      isDataLoaded: false, // Add loading state to prevent flicker
    };
  },
  computed: {
    likedBubblesForDisplay() {
      const liked = this.allBubblesData.filter(bubble => this.likedBubbles.has(bubble.id));
      
      return liked.map((bubble, index) => ({
        ...bubble,
        x: this.generatePosition(index, 'x'),
        y: this.generatePosition(index, 'y'),
        size: this.generateSize(index),
        delay: index * 0.5
      }));
    }
  },
  methods: {
    loadLikesFromStorage() {
      try {
        const saved = localStorage.getItem('likedBubbles');
        if (saved) {
          const likesArray = JSON.parse(saved);
          this.likedBubbles = new Set(likesArray);
          console.log('Private Board - Loaded likes from localStorage:', likesArray);
        }
      } catch (error) {
        console.error('Error loading likes from localStorage:', error);
        this.likedBubbles = new Set();
      }
    },

    async fetchAllBubbles() {
      try {
        console.log('Private Board - Fetching all bubbles from Firebase...');
        const querySnapshot = await getDocs(collection(db, 'bubbles'));
        this.allBubblesData = [];

        querySnapshot.forEach((doc) => {
          const d = doc.data();
          const type = (d.event_type || 'misc').toString().toLowerCase();

          const item = {
            id: doc.id,
            event_name: d.event_title || 'Unnamed Event',
            event_time: this.normalizeWhen(d.event_when || d.bubble_created),
            fullData: d,
            colorClass: this.getColorForType(type),
            event_type: type
          };

          this.allBubblesData.push(item);
        });

        console.log('Private Board - Fetched', this.allBubblesData.length, 'total bubbles');
        console.log('Private Board - Found', this.likedBubblesForDisplay.length, 'liked bubbles');
        
        // Mark data as loaded to prevent background flicker
        this.isDataLoaded = true;
      } catch (err) {
        console.error('Failed to fetch bubbles:', err);
        this.isDataLoaded = true; // Still mark as loaded to show error state
      }
    },

    generatePosition(index, axis) {
      const positions = [
        { x: 15, y: 20 },
        { x: 75, y: 15 },
        { x: 10, y: 60 },
        { x: 60, y: 50 },
        { x: 80, y: 70 },
        { x: 30, y: 80 },
        { x: 50, y: 25 },
        { x: 85, y: 45 },
      ];
      
      const pos = positions[index % positions.length];
      return axis === 'x' ? pos.x : pos.y;
    },

    generateSize(index) {
      const sizes = [150, 130, 140, 120, 160, 135, 125, 145];
      return sizes[index % sizes.length];
    },

    updateContainerSize() {
      const el = this.$refs.bubbleContainer;
      if (el) {
        const topBar = document.querySelector('.topbar');
        const bottomBar = document.querySelector('.bottombar');
        const topH = topBar ? Math.round(topBar.getBoundingClientRect().height) : 72;
        const bottomH = bottomBar ? Math.round(bottomBar.getBoundingClientRect().height) : 72;

        const availableHeight = Math.max(120, window.innerHeight - topH - bottomH);
        el.style.height = `${availableHeight}px`;

        this.containerWidth = el.clientWidth || 0;
        this.containerHeight = el.clientHeight || 0;
      }
    },

    bubbleStyle(bubble, index) {
      const w = this.containerWidth;
      const h = this.containerHeight;
      const size = bubble.size || 150;

      const style = {
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${bubble.delay}s`,
        lineHeight: `${size}px`,
      };

      if (w > 0 && h > 0) {
        const maxAllowed = Math.min(w * 0.6, h * 0.6);
        const sizeClamp = Math.min(size, Math.max(24, maxAllowed));

        let leftPx = (bubble.x / 100) * w;
        let topPx = (bubble.y / 100) * h;

        const safetyMargin = 22;
        const maxLeft = Math.max(0, w - sizeClamp);
        const maxTop = Math.max(0, h - sizeClamp - safetyMargin);

        leftPx = Math.max(0, Math.min(leftPx, maxLeft));
        topPx = Math.max(0, Math.min(topPx, maxTop));

        style.width = `${sizeClamp}px`;
        style.height = `${sizeClamp}px`;
        style.lineHeight = `${sizeClamp}px`;
        style.left = `${leftPx}px`;
        style.top = `${topPx}px`;
        style.transform = 'none';
      } else {
        style.left = `${bubble.x}%`;
        style.top = `${bubble.y}%`;
        style.transform = 'translate(-50%, -50%)';
      }

      return style;
    },

    selectBubble(bubble) {
      this.selectedBubble = bubble;
    },

    getBubbleType(bubble) {
      if (bubble.event_type.includes('favour')) return 'Favour';
      if (bubble.event_type.includes('question')) return 'Question';
      if (bubble.event_type.includes('announcement')) return 'Announcement';
      return 'Other';
    },

    getColorForType(type) {
      if (type.includes('favour')) return 'is-pastel-red';
      if (type.includes('question')) return 'is-pastel-blue';
      return 'is-pastel-green';
    },

    normalizeWhen(value) {
      if (!value) return '';
      if (value && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      try {
        return new Date(value).toISOString();
      } catch {
        return '';
      }
    },

    formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
    }
  },

  async mounted() {
    console.log('Private Board mounted');
    
    this.loadLikesFromStorage();
    await this.fetchAllBubbles();
    
    this.$nextTick(() => this.updateContainerSize());
    this._resizeHandler = () => this.updateContainerSize();
    window.addEventListener('resize', this._resizeHandler);
  },

  beforeUnmount() {
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
  },
};
</script>

<style scoped>
/* Loading message */
.loading-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
  font-size: 1.2em;
}

.bubble-container {
  position: relative;
  width: 100%;
  overflow: visible;
  margin: 0 auto;
  /* Ensure no background shows during loading */
  background: transparent;
  min-height: 200px;
}

.bubble {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  font-weight: bold;
  font-size: 1em;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  animation: float 10s ease-in-out infinite;
  will-change: transform;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.bubble:hover {
  transform: scale(1.05) !important;
}

.bubble p {
  margin: 0;
  padding: 0 12px;
  line-height: 1.2;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.heart-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.no-likes-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #666;
  max-width: 400px;
}

.no-likes-message h2 {
  color: #333;
  margin-bottom: 16px;
}

.no-likes-message p {
  margin-bottom: 24px;
  font-size: 1.1em;
  line-height: 1.5;
}

.go-public-btn {
  background: #48c0c8;
  color: white;
  padding: 12px 24px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  transition: background 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.go-public-btn:hover {
  background: #3aa5ac;
  color: white;
}

/* Bubble Modal */
.bubble-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  
}



.modal-body p {
  margin: 12px 0;
  color: #333;
}

.liked-indicator {
  background: #ff6b9d;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  text-align: center;
  margin-top: 16px;
  font-weight: 600;
}

.hero-body {
  display: flex;
  align-items: stretch;
  justify-content: center;
  background: white;
}

.container.stretch { 
  height: auto; 
}

/* Top bar styles */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #eab580;
  box-shadow: 0 2px 0 rgba(0,0,0,0.06) inset;
  z-index: 1000;
}
.topbar-inner {
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.topbar-title {
  font-size: 20px;
  color: #073642;
}
.login-btn {
  position: absolute;
  right: 18px;
  top: 12px;
  height: 48px;
  padding: 0 20px;
  border-radius: 10px;
  background: #a16d3a;
  color: white;
  font-weight: 700;
  border: none;
  box-shadow: 4px 6px 8px rgba(0,0,0,0.15);
  cursor: pointer;
}
.login-btn:active { transform: translateY(1px); }

/* FIXED Bottom bar styles - Toggle positioning */
.bottombar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 72px;
  background: #eab580;
  z-index: 1000;
}
.bottombar-inner {
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-right: 18px;
  box-sizing: border-box;
}
.bottombar-left, .bottombar-right { 
  color: #073642; 
  flex-shrink: 0;
}
.bottombar-toggle { 
  display: flex; 
  align-items: center;
  flex-shrink: 0;
}

/* FIXED Toggle track and thumb positioning */
.toggle-track {
  width: 58px;
  height: 28px;
  background: #fff;
  border-radius: 20px;
  box-shadow: inset 0 0 0 2px #eab580;
  display: flex;
  align-items: center;
  padding: 2px;
  box-shadow: 4px 6px 8px rgba(0,0,0,0.15);
  position: relative;
  overflow: hidden; /* Prevent thumb from going outside */
}

.toggle-thumb {
  width: 24px;
  height: 24px;
  background: #a16d3a;
  border-radius: 50%;
  transition: transform 0.22s cubic-bezier(.2,.9,.2,1);
  position: absolute;
  left: 2px; /* Default position (Public) */
}

/* Private state - thumb moves to the right */
.private-state .private-thumb {
  transform: translateX(30px); /* Move to right side */
}

.hero.is-light { 
  padding-top: 0; 
  padding-bottom: 0; 
  background: transparent; /* Ensure no background flicker */
}

/* Pastel Colors */
.is-pastel-red {
  background: linear-gradient(135deg, #ff8a80, #ff5252);
}
.is-pastel-blue {
  background: linear-gradient(135deg, #40c4ff, #0091ea);
}
.is-pastel-green {
  background: linear-gradient(135deg, #69f0ae, #00c853);
}

/* Keyframe animation for floating */
@keyframes float {
  0% { transform: translate(0, 0px); }
  50% { transform: translate(0, 15px); }
  100% { transform: translate(0, 0px); }
}

.bubble:nth-child(even) {
    animation: float-h 12s ease-in-out infinite;
}
@keyframes float-h {
  0% { transform: translate(0px, 0); }
  50% { transform: translate(15px, 0); }
  100% { transform: translate(0px, 0); }
}
</style>
