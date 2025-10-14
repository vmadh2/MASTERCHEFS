<template>
  <!-- Top bar (fixed) matching provided design -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-title">"THE INTERACTIVE BULLETIN"</div>
      <router-link :to="{ name: 'form-sheet' }" class="login-btn" role="button" aria-label="Open form sheet">
        Post
      </router-link>
      <router-link :to="{ name: 'test' }" class="test-btn" role="button" aria-label="Open test page">
        Test
      </router-link>
    </div>
  </header>

  <section class="hero is-light">
    <!-- The ref on this container is crucial for measuring dimensions -->
    <div class="content-container" ref="contentContainer">
      <ul class="list">
        <!-- Loop over the 'positionedItems' data property -->
        <li v-for="item in positionedItems" :key="item.id" class="list-item" :class="item.colorClass"
          :style="item.position" @click="selectItem(item)">
          <div class="item-title">{{ item.event_name }}</div>
          <div class="item-time">{{ formatTime(item.event_time) }}</div>
        </li>
        <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items to display</li>
      </ul>

      <div v-if="selectedItem" class="details">
        <h3>Details for {{ selectedItem.event_name }}</h3>
        <!-- Displaying the raw data for debugging -->
        <pre>{{ JSON.stringify(selectedItem.fullData, null, 2) }}</pre>
        <button @click="selectedItem = null">Close</button>
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
// Make sure this path is correct for your project structure
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
    // --- DATA FETCHING & PROCESSING ---
    async fetchBubbles() {
      if (this.loading.fetchAll) return;
      this.loading.fetchAll = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'bubbles'));
        this.sections.forEach((s) => (s.items = [])); // Reset sections

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

    // --- LAYOUT & COLLISION AVOIDANCE ---
    generateNonOverlappingLayout() {
      const container = this.$refs.contentContainer;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const allItems = this.sections.flatMap(s => s.items);
      const shuffled = allItems.sort(() => 0.5 - Math.random());
      const itemsToPlace = shuffled.slice(0, 5);

      const placedBubbles = [];
      // --- UPDATED: A single, consistent diameter for all bubbles ---
      const BUBBLE_DIAMETER = 150;

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
      const padding = 15;

      for (let i = 0; i < maxTries; i++) {
        const x = Math.random() * (containerWidth - diameter) + radius;
        const y = Math.random() * (containerHeight - diameter) + radius;

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
      // Fallback if no valid position is found
      return {
        x: Math.random() * (containerWidth - diameter) + radius,
        y: Math.random() * (containerHeight - diameter) + radius
      };
    },

    // --- HELPERS ---
    getColorForType(type) {
      if (type.includes('favour')) return 'is-pastel-red';
      if (type.includes('question')) return 'is-pastel-blue';
      return 'is-pastel-green'; // Announcement
    },

    normalizeWhen(value) {
      if (!value) return '';
      // Firebase Timestamps from the SDK have a toDate() method
      if (value && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      // Fallback for strings or other date formats
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
    },

    selectItem(item) {
      this.selectedItem = item;
    }
  },
  mounted() {
    this.fetchBubbles();
    window.addEventListener('resize', this.generateNonOverlappingLayout);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.generateNonOverlappingLayout);
  },
};
</script>

<style scoped>
/* Main layout styles */
.hero.is-light {
  padding-top: 0;
  padding-bottom: 0;
  height: 100vh;
}

.content-container {
  padding-top: 72px;
  padding-bottom: 72px;
  position: relative;
  height: 100vh;
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
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transform: translate(-50%, -50%);
  animation: float 8s ease-in-out infinite alternate;
  transition: transform 0.3s ease;
}

.list-item:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

/* --- UPDATED: Removed .small-event class --- */

.item-title {
  font-weight: 600;
  color: white;
  font-size: 1em;
  line-height: 1.2;
  padding: 0 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.item-time {
  font-size: 0.8em;
  color: white;
  margin-top: 5px;
  opacity: 0.9;
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

/* Category Colors */
.is-pastel-red {
  background: linear-gradient(135deg, #ff8a80, #ff5252);
  /* Favour */
}

.is-pastel-blue {
  background: linear-gradient(135deg, #40c4ff, #0091ea);
  /* Question */
}

.is-pastel-green {
  background: linear-gradient(135deg, #69f0ae, #00c853);
  /* Announcement */
}

/* Animation */
@keyframes float {
  from {
    transform: translate(-25%, -25%) translateY(0px) rotate(0deg);
  }

  to {
    transform: translate(-25%, -25%) translateY(-20px) rotate(0deg);
  }
}

/* Top/Bottom Bars (Unchanged) */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #8de3ea;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06) inset;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.topbar-inner {
  width: 100%;
  max-width: 1100px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 18px;
  box-sizing: border-box;
}

.topbar-title {
  font-size: 20px;
  color: #073642;
}

.login-btn,
.test-btn {
  height: 48px;
  border-radius: 10px;
  color: white;
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  box-shadow: 4px 6px 8px rgba(0, 0, 0, 0.15);
  position: absolute;
  top: 12px;
}

.login-btn {
  right: 18px;
  background: #48c0c8;
}

.test-btn {
  right: 96px;
  background: #ffd166;
  color: #073642;
}

.bottombar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 72px;
  background: #8de3ea;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bottombar-inner {
  width: 100%;
  max-width: 1100px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-right: 18px;
  box-sizing: border-box;
}

.bottombar-left,
.bottombar-right {
  color: #073642;
}

.bottombar-toggle {
  display: flex;
  align-items: center;
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
}

.toggle-thumb {
  width: 24px;
  height: 24px;
  background: #2f9b9f;
  border-radius: 50%;
  transition: transform 0.22s cubic-bezier(.2, .9, .2, 1);
}
</style>

