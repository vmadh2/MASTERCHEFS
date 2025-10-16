<template>
  <div>
    <!-- Top bar (fixed) -->
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-title">THE INTERACTIVE BULLETIN</div>
        <router-link :to="{ name: 'form-sheet' }" class="login-btn" role="button" aria-label="Open form sheet">
          Post
        </router-link>
      </div>
    </header>

    <!-- Filter Controls -->
    <div class="filter-bar">
      <div class="filter-section">
        <label>Filter by Type:</label>
        <select v-model="typeFilter">
          <option value="all">All Types</option>
          <option value="favour">Favour</option>
          <option value="question">Question</option>
          <option value="announcement">Announcement</option>
        </select>
      </div>
      <div class="filter-section">
        <label>Filter by Status:</label>
        <select v-model="likedFilter">
          <option value="all">All Bubbles</option>
          <option value="liked">Liked Only</option>
          <option value="unliked">Unliked Only</option>
        </select>
      </div>
      <div class="filter-stats">
        Showing {{ positionedItems.length }} of {{ allBubblesData.length }} bubbles
      </div>
    </div>

    <section class="hero is-light">
      <div class="content-container" ref="contentContainer">
        <ul class="list">
          <li v-for="item in positionedItems" :key="item.id" class="list-item"
            :class="[item.colorClass, item.sizeClass]" :style="item.position" @click="selectItem(item)">
            <div class="item-title">{{ item.event_name }}</div>
            <div class="item-time">{{ formatTime(item.event_time) }}</div>
            <button class="like-btn" :class="{ 'liked': isLiked(item.id) }" @click.stop="toggleLike(item)"
              :title="isLiked(item.id) ? 'Unlike' : 'Like'">
              {{ isLiked(item.id) ? '❤️' : '🤍' }}
            </button>
          </li>
          <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items match filters</li>
        </ul>

        <!-- Liking Modals and Counters -->
        <div class="liked-counter">
          <span>❤️ {{ likedBubbles.size }} liked</span>
          <button @click="showLikedModal = true" class="view-liked-btn">View</button>
        </div>
        <div v-if="showLikedModal" class="liked-modal" @click.self="showLikedModal = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>❤️ Liked Bubbles ({{ likedBubblesData.length }})</h3>
              <button @click="showLikedModal = false" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div v-if="likedBubblesData.length === 0" class="no-liked">No bubbles liked yet!</div>
              <div v-else class="liked-list">
                <div v-for="bubble in likedBubblesData" :key="bubble.id" class="liked-item"
                  :class="bubble.colorClass">
                  <div class="liked-item-content">
                    <h4>{{ bubble.event_name }}</h4>
                    <p>{{ formatTime(bubble.event_time) }}</p>
                  </div>
                  <button @click="toggleLike(bubble)" class="unlike-btn">❤️</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button @click="clearAllLikes" class="clear-all-btn">Clear All</button>
            </div>
          </div>
        </div>
        <div v-if="selectedItem" class="details">
          <h3>Details for {{ selectedItem.event_name }}</h3>
          <pre>{{ JSON.stringify(selectedItem.fullData, null, 2) }}</pre>
          <button @click="selectedItem = null">Close</button>
        </div>
      </div>
    </section>

    <!-- Bottom Bar with Functional Toggle -->
    <footer class="bottombar">
      <div class="bottombar-inner">
        <div class="bottombar-left">Public</div>
        <router-link :to="{ name: 'home-board' }" class="bottombar-toggle toggle-track" role="switch"
          aria-checked="true" tabindex="0" aria-label="Toggle to Public board">
          <div class="toggle-thumb private-thumb"></div>
        </router-link>
        <div class="bottombar-right">Private</div>
      </div>
    </footer>
  </div>
</template>

<script>
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

export default {
  name: 'PrivateBoard',
  data() {
    return {
      allBubblesData: [],
      positionedItems: [],
      loading: { fetchAll: false },
      selectedItem: null,
      likedBubbles: new Set(),
      showLikedModal: false,
      typeFilter: 'all',
      likedFilter: 'all',
    };
  },
  computed: {
    likedBubblesData() {
      return this.allBubblesData.filter(bubble => this.likedBubbles.has(bubble.id));
    },
    filteredItems() {
      let filtered = [...this.allBubblesData];
      if (this.typeFilter !== 'all') {
        filtered = filtered.filter(item => {
          const type = (item.fullData.event_type || 'misc').toString().toLowerCase();
          return type.includes(this.typeFilter);
        });
      }
      if (this.likedFilter === 'liked') {
        filtered = filtered.filter(item => this.isLiked(item.id));
      } else if (this.likedFilter === 'unliked') {
        filtered = filtered.filter(item => !this.isLiked(item.id));
      }
      return filtered;
    }
  },
  methods: {
    toggleLike(item) {
      if (this.likedBubbles.has(item.id)) {
        this.likedBubbles.delete(item.id);
      } else {
        this.likedBubbles.add(item.id);
      }
      this.saveLikesToStorage();
      this.$forceUpdate();
    },
    isLiked(bubbleId) {
      return this.likedBubbles.has(bubbleId);
    },
    saveLikesToStorage() {
      localStorage.setItem('likedBubbles', JSON.stringify(Array.from(this.likedBubbles)));
    },
    loadLikesFromStorage() {
      const saved = localStorage.getItem('likedBubbles');
      if (saved) {
        this.likedBubbles = new Set(JSON.parse(saved));
      }
    },
    clearAllLikes() {
      if (confirm('Are you sure you want to clear all liked bubbles?')) {
        this.likedBubbles.clear();
        this.saveLikesToStorage();
        this.$forceUpdate();
      }
    },
    getBubbleSize(eventName) {
        const len = eventName.length;
        if (len <= 15) return { class: 'size-s', diameter: 120 };
        if (len <= 30) return { class: 'size-m', diameter: 160 };
        return { class: 'size-l', diameter: 200 };
    },
    async fetchBubbles() {
      if (this.loading.fetchAll) return;
      this.loading.fetchAll = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'bubbles'));
        const bubbles = [];
        querySnapshot.forEach((doc) => {
          const d = doc.data();
          const type = (d.event_type || 'misc').toString().toLowerCase();
          const eventName = d.event_title || 'Unnamed Event';
          bubbles.push({
            id: doc.id,
            event_name: eventName,
            event_time: this.normalizeWhen(d.event_when || d.bubble_created),
            fullData: d,
            colorClass: this.getColorForType(type),
            sizeInfo: this.getBubbleSize(eventName)
          });
        });
        this.allBubblesData = bubbles;
        this.generateNonOverlappingLayout();
      } catch (err) {
        console.error('Failed to fetch bubbles:', err);
      } finally {
        this.loading.fetchAll = false;
      }
    },
    generateNonOverlappingLayout() {
      const container = this.$refs.contentContainer;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const itemsToPlace = this.filteredItems.slice(0, 10);
      const placedBubbles = [];

      itemsToPlace.forEach(item => {
        const bubbleDiameter = item.sizeInfo.diameter;
        const position = this.findValidPosition(placedBubbles, bubbleDiameter, containerWidth, containerHeight);
        if (position) {
          placedBubbles.push({
            ...item,
            position: {
              left: `${(position.x / containerWidth) * 100}%`,
              top: `${(position.y / containerHeight) * 100}%`,
            },
            sizeClass: item.sizeInfo.class,
            px: position.x,
            py: position.y,
            diameter: bubbleDiameter
          });
        }
      });
      this.positionedItems = placedBubbles;
    },
    findValidPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const maxTries = 100;
      const radius = diameter / 2;
      const padding = 15;
      for (let i = 0; i < maxTries; i++) {
        const x = Math.random() * (containerWidth - diameter - padding * 2) + radius + padding;
        const y = Math.random() * (containerHeight - diameter - padding * 2) + radius + padding;
        let hasOverlap = false;
        for (const placed of placedBubbles) {
          const dx = x - placed.px;
          const dy = y - placed.py;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (radius + placed.diameter / 2) + padding;
          if (distance < minDistance) {
            hasOverlap = true;
            break;
          }
        }
        if (!hasOverlap) return { x, y };
      }
      return null; // Return null if no position found
    },
    getColorForType(type) {
      if (type.includes('favour')) return 'is-pastel-red';
      if (type.includes('question')) return 'is-pastel-blue';
      return 'is-pastel-green';
    },
    normalizeWhen(value) {
      if (!value) return '';
      if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
      try {
        return new Date(value).toISOString();
      } catch { return ''; }
    },
    selectItem(item) {
      this.selectedItem = item;
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  },
  watch: {
    typeFilter() { this.generateNonOverlappingLayout(); },
    likedFilter() { this.generateNonOverlappingLayout(); }
  },
  mounted() {
    this.loadLikesFromStorage();
    this.fetchBubbles();
    window.addEventListener('resize', this.generateNonOverlappingLayout);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.generateNonOverlappingLayout);
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

:global(body) {
    font-family: 'Poppins', sans-serif;
}

/* --- Filter Bar Styles --- */
.filter-bar {
  position: fixed;
  top: 72px; /* Sits below the topbar */
  left: 0;
  right: 0;
  background: #fdfcfa;
  border-bottom: 1px solid #f0e9e1;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  z-index: 999;
  height: 60px; /* Explicit height */
  box-sizing: border-box;
}
.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-section label {
  font-weight: 600;
  color: #5d4037;
  font-size: 14px;
}
.filter-section select {
  padding: 6px 12px;
  border: 1px solid #d7ccc8;
  border-radius: 6px;
  background: white;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  color: #3e2723;
  cursor: pointer;
}
.filter-stats {
  margin-left: auto;
  font-size: 14px;
  color: #795548;
}

/* --- Liking & Modal Styles --- */
.like-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 10;
}
.like-btn:hover { transform: scale(1.1); }
.like-btn.liked { animation: heartBeat 0.6s ease; }
@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
.liked-counter {
  position: fixed;
  bottom: 90px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 16px;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1500;
}
.liked-counter span { font-weight: 600; color: #333; }
.view-liked-btn {
  background: #ff6b9d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}
.liked-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.modal-header, .modal-body, .modal-footer {
  padding: 20px;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.modal-header h3 { margin: 0; color: #333; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }
.modal-body { flex: 1; overflow-y: auto; }
.no-liked { text-align: center; color: #666; font-style: italic; padding: 40px 0; }
.liked-list { display: flex; flex-direction: column; gap: 12px; }
.liked-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 12px; color: white; }
.liked-item-content h4 { margin: 0 0 4px 0; font-size: 16px; }
.liked-item-content p { margin: 0; font-size: 12px; opacity: 0.9; }
.unlike-btn { background: none; border: none; font-size: 18px; cursor: pointer; padding: 4px; }
.modal-footer { border-top: 1px solid #eee; display: flex; justify-content: center; }
.clear-all-btn { background: #ff4757; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }

/* --- Main Layout Styles --- */
.hero.is-light {
  padding: 0;
  margin: 0;
  height: 100vh;
  background-color: #f7f9fc;
  background-image: url('data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23dce7f0" fill-opacity="0.6" fill-rule="evenodd"%3E%3Cpath d="M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z"/%3E%3C/g%3E%3C/svg%3E');
}
/* --- 💡 CSS FIX: Container now sits between all bars --- */
.content-container {
  position: fixed;
  top: 132px; /* 72px for topbar + 60px for filter bar */
  bottom: 72px; /* 72px for bottombar */
  left: 0;
  right: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding: 20px; /* Inner padding for bubbles */
}

/* --- Bubble Styles --- */
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
  width: 100%;
  height: 100%;
}
.list-item {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  animation: float 10s ease-in-out infinite alternate;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.list-item:hover {
  transform: translate(-50%, -50%) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}
.size-s { width: 120px; height: 120px; font-size: 0.9em; }
.size-m { width: 160px; height: 160px; font-size: 1em; }
.size-l { width: 200px; height: 200px; font-size: 1.1em; }
.item-title {
  font-weight: 600;
  color: white;
  line-height: 1.3;
  padding: 0 15px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}
.item-time {
  font-size: 0.8em;
  color: white;
  margin-top: 5px;
  opacity: 0.8;
}
.empty {
  color: #888;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.details {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  padding: 16px;
  border-radius: 12px;
  background: white;
  z-index: 1001;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}
.details pre {
  background: #f1f1f1;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  max-height: 200px;
}
.is-pastel-red { background: linear-gradient(135deg, #ff8a80, #ff5252); }
.is-pastel-blue { background: linear-gradient(135deg, #40c4ff, #0091ea); }
.is-pastel-green { background: linear-gradient(135deg, #69f0ae, #00c853); }

/* --- 💡 CSS FIX: Animation correctly centers the bubble --- */
@keyframes float {
  from { transform: translate(-50%, -50%) translateY(0px); }
  to { transform: translate(-50%, -50%) translateY(-20px); }
}

/* --- Bars and Toggle --- */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #eab580;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
}
.bottombar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #eab580;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
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
  font-weight: 600;
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
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  font-weight: 600;
}
.bottombar-left, .bottombar-right {
  color: #073642;
}
.toggle-track {
  width: 58px;
  height: 28px;
  background: #fff;
  border-radius: 20px;
  box-shadow: inset 0 0 0 2px #eab580;
  display: flex;
  align-items: center;
  padding: 2px;
  position: relative;
  cursor: pointer;
}
.toggle-thumb {
  width: 24px;
  height: 24px;
  background: #a16d3a;
  border-radius: 50%;
  transition: transform 0.22s cubic-bezier(.2,.9,.2,1);
  position: absolute;
  left: 2px;
}
.private-thumb {
  transform: translateX(30px);
}
</style>

