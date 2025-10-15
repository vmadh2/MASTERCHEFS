<template>
    <!-- Top bar (fixed) with original colors -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-title">THE INTERACTIVE BULLETIN</div>
      <router-link :to="{ name: 'form-sheet' }" class="login-btn" role="button" aria-label="Open form sheet">
        Post
      </router-link>
      <router-link :to="{ name: 'test' }" class="test-btn" role="button" aria-label="Open test page">
        Test
      </router-link>
    </div>
  </header>

  <section class="hero is-light">
    <div class="content-container" ref="contentContainer">
      <ul class="list">
        <li v-for="item in positionedItems" :key="item.id" class="list-item" :class="item.colorClass"
          :style="item.position" @click="selectItem(item)">
          <div class="item-title">{{ item.event_name }}</div>
          <div class="item-time">{{ formatTime(item.event_time) }}</div>
        </li>
        <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items to display</li>
      </ul>

      <!-- 💡 UPDATED: Details panel with useful, formatted information -->
      <div v-if="selectedItem" class="details-overlay" @click.self="selectedItem = null">
        <div class="details-card">
          <div class="details-header">
            <h3>{{ selectedItem.fullData.event_title }}</h3>
            <button @click="selectedItem = null" class="close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="details-body">
            <p>{{ selectedItem.fullData.description }}</p>
          </div>
          <div class="details-meta">
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather-user">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Posted by: <strong>{{ selectedItem.fullData.author_name }}</strong></span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="feather-calendar">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Event on: <strong>{{ formatDetailedTime(selectedItem.event_time) }}</strong></span>
            </div>
            <div class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather-mail">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Contact: <strong>{{ selectedItem.fullData.author_contact }}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bottom bar (fixed) -->
  <footer class="bottombar">
    <div class="bottombar-inner">
      <div class="bottombar-left">Public</div>
      <router-link :to="{ name: 'private-board' }" class="bottombar-toggle toggle-track" role="switch"
        aria-checked="false" tabindex="0" aria-label="Toggle visibility between Public and Private">
        <div class="toggle-thumb"></div>
      </router-link>
      <div class="bottombar-right">Private</div>
    </div>
  </footer>
</template>

<script>
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'

export default {
  name: 'HomeBoard',
  data() {
    return {
      sections: [
        { key: 'favour', label: 'Favour', items: [] },
        { key: 'question', label: 'Question', items: [] },
        { key: 'announcement', label: 'Announcement', items: [] },
      ],
      positionedItems: [],
      loading: { fetchAll: false },
      selectedItem: null,
    };
  },
  methods: {
    async fetchBubbles() {
      if (this.loading.fetchAll) return;
      this.loading.fetchAll = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'bubbles'));
        this.sections.forEach((s) => (s.items = []));

        querySnapshot.forEach((doc) => {
          const d = doc.data();
          const type = (d.event_type || 'misc').toString().toLowerCase();
          const item = {
            id: doc.id,
            event_name: d.event_title || 'Unnamed Event',
            event_time: this.normalizeWhen(d.event_when || d.bubble_created),
            fullData: d,
            colorClass: this.getColorForType(type)
          };
          if (type.includes('favour')) this.sections[0].items.push(item);
          else if (type.includes('question')) this.sections[1].items.push(item);
          else this.sections[2].items.push(item);
        });

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
      const allItems = this.sections.flatMap(s => s.items);
      const shuffled = allItems.sort(() => 0.5 - Math.random());
      const itemsToPlace = shuffled.slice(0, 5);

      const placedBubbles = [];
      const BUBBLE_DIAMETER = 160;

      itemsToPlace.forEach(item => {
        const position = this.findValidPosition(placedBubbles, BUBBLE_DIAMETER, containerWidth, containerHeight);
        if (position) {
          placedBubbles.push({
            ...item,
            position: {
              left: `${(position.x / containerWidth) * 100}%`,
              top: `${(position.y / containerHeight) * 100}%`,
            },
            px: position.x,
            py: position.y,
            diameter: BUBBLE_DIAMETER
          });
        }
      });
      this.positionedItems = placedBubbles;
    },
    findValidPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const maxTries = 100;
      const radius = diameter / 2;
      const padding = 25;

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
      return null;
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
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU');
    },
    // --- 💡 ADDED: New formatter for the details panel ---
    formatDetailedTime(iso) {
      if (!iso) return 'Not specified';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleString('en-AU', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
    },
    selectItem(item) {
      this.selectedItem = item;
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.fetchBubbles();
      window.addEventListener('resize', this.generateNonOverlappingLayout);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.generateNonOverlappingLayout);
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

:global(body) {
  font-family: 'Poppins', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hero.is-light {
  padding: 0;
  margin: 0;
  height: 100vh;
  background-color: #f7f9fc;
  background-image: url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23dce7f0" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
}

.content-container {
  position: fixed;
  top: 72px;
  bottom: 72px;
  left: 0;
  right: 0;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

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
  width: 160px;
  height: 160px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04), 0 10px 25px rgba(45, 55, 72, 0.08);
  cursor: pointer;
  animation: float 8s ease-in-out infinite alternate;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.list-item:hover {
  animation-play-state: paused;
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.06), 0 20px 40px rgba(45, 55, 72, 0.1);
}

.item-title {
  font-weight: 600;
  color: white;
  font-size: 1.05em;
  line-height: 1.3;
  padding: 0 15px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.25);
  margin-bottom: 4px;
}

.item-time {
  font-weight: 400;
  font-size: 0.8em;
  color: white;
  opacity: 0.85;
}

.empty {
  color: #a0aec0;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* --- 💡 NEW: Styles for the details modal --- */
.details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(10, 20, 30, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  backdrop-filter: blur(8px);
}

.details-card {
  width: 90%;
  max-width: 500px;
  padding: 24px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease-out;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.details-header h3 {
  margin: 0;
  font-size: 1.4em;
  color: #2d3748;
  line-height: 1.3;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #a0aec0;
  padding: 4px;
}

.close-btn:hover {
  color: #4a5568;
}

.details-body p {
  margin: 0 0 20px 0;
  color: #4a5568;
  font-size: 1em;
  line-height: 1.6;
}

.details-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9em;
  color: #718096;
}

.meta-item svg {
  flex-shrink: 0;
}

.meta-item strong {
  color: #2d3748;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.is-pastel-red {
  background: linear-gradient(145deg, #FF9A8B, #FF6A88);
}

.is-pastel-blue {
  background: linear-gradient(145deg, #89CFF0, #6495ED);
}

.is-pastel-green {
  background: linear-gradient(145deg, #98FB98, #55C595);
}

@keyframes float {
  from {
    transform: translate(-50%, -50%) translateY(0px) rotate(-3deg);
  }

  to {
    transform: translate(-50%, -50%) translateY(-20px) rotate(3deg);
  }
}

.topbar,
.bottombar {
  position: fixed;
  left: 0;
  right: 0;
  height: 72px;
  background: #8de3ea;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.topbar {
  top: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.bottombar {
  bottom: 0;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.05);
}

.topbar-inner,
.bottombar-inner {
  width: 100%;
  max-width: 1100px;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 18px;
  box-sizing: border-box;
}

.topbar-inner {
  justify-content: center;
  position: relative;
}

.bottombar-inner {
  justify-content: flex-end;
  gap: 12px;
}

.topbar-title {
  font-size: 20px;
  font-weight: 700;
  color: #073642;
}

.login-btn,
.test-btn {
  height: 48px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: absolute;
  top: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:active,
.test-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.login-btn {
  right: 18px;
  background: #48c0c8;
  color: white;
}

.test-btn {
  right: 122px;
  background: #ffffff;
  color: #48c0c8;
  border: 1px solid #b2e9ed;
}

.bottombar-left,
.bottombar-right {
  color: #073642;
  font-weight: 600;
}

.toggle-track {
  width: 58px;
  height: 28px;
  background: #fff;
  border-radius: 20px;
  box-shadow: inset 0 0 0 2px #86d2d7;
  display: flex;
  align-items: center;
  padding: 2px;
  cursor: pointer;
}

.toggle-thumb {
  width: 24px;
  height: 24px;
  background: #2f9b9f;
  border-radius: 50%;
  transition: transform 0.22s cubic-bezier(.2, .9, .2, 1);
}
</style>
