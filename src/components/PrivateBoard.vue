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
      >
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
      Showing {{ filteredItems.length }} of {{ allBubblesData.length }} bubbles
      | ❤️ {{ likedBubbles.size }} liked
    </div>
  </div>

  <section class="hero is-light">
    <!-- The ref on this container is crucial for measuring dimensions -->
    <div class="content-container" ref="contentContainer">
      <ul class="list">
        <!-- Loop over the 'positionedItems' data property with dynamic sizes -->
        <li v-for="item in positionedItems" :key="item.id" 
            class="list-item" 
            :class="item.colorClass"
            :style="{ ...item.position, ...item.dynamicStyle }" 
            @click="selectItem(item)">
          <div class="item-title">{{ item.event_name }}</div>
          <div class="item-time">{{ formatTime(item.event_time) }}</div>
          
          <!-- Like Heart Button -->
          <button 
            class="like-btn" 
            :class="{ 'liked': isLiked(item.id) }"
            @click.stop="toggleLike(item)"
            :title="isLiked(item.id) ? 'Unlike' : 'Like'"
          >
            {{ isLiked(item.id) ? '❤️' : '🤍' }}
          </button>
        </li>
        <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items to display</li>
      </ul>

      <!-- Liked Items Counter -->
      <div class="liked-counter">
        <span>❤️ {{ likedBubbles.size }} bubbles liked</span>
        <button @click="showLikedModal = true" class="view-liked-btn">View Liked</button>
      </div>

      <!-- Liked Bubbles Modal -->
      <div v-if="showLikedModal" class="liked-modal" @click.self="showLikedModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>❤️ Liked Bubbles ({{ likedBubblesData.length }})</h3>
            <button @click="showLikedModal = false" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="likedBubblesData.length === 0" class="no-liked">
              No bubbles liked yet!
            </div>
            <div v-else class="liked-list">
              <div v-for="bubble in likedBubblesData" :key="bubble.id" class="liked-item" :class="bubble.colorClass">
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
        <!-- Displaying the raw data for debugging -->
        <pre>{{ JSON.stringify(selectedItem.fullData, null, 2) }}</pre>
        <button @click="selectedItem = null">Close</button>
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
      sections: [
        { key: 'favour', label: 'Favour', items: [] },
        { key: 'question', label: 'Question', items: [] },
        { key: 'announcement', label: 'Announcement', items: [] },
      ],
      positionedItems: [],
      loading: { fetchAll: false },
      selectedItem: null,
      allBubblesData: [],
      // Liking functionality
      likedBubbles: new Set(), // Store liked bubble IDs
      showLikedModal: false,
      // Filtering
      typeFilter: 'all', // all, favour, question, announcement
      likedFilter: 'all', // all, liked, unliked
    };
  },
  computed: {
    likedBubblesData() {
      // Return full data for liked bubbles
      return this.allBubblesData.filter(bubble => this.likedBubbles.has(bubble.id));
    },
    
    filteredItems() {
      let filtered = [...this.allBubblesData];
      
      // Filter by type
      if (this.typeFilter !== 'all') {
        filtered = filtered.filter(item => {
          const type = (item.fullData.event_type || 'misc').toString().toLowerCase();
          return type.includes(this.typeFilter);
        });
      }
      
      // Filter by liked status
      if (this.likedFilter === 'liked') {
        filtered = filtered.filter(item => this.likedBubbles.has(item.id));
      } else if (this.likedFilter === 'unliked') {
        filtered = filtered.filter(item => !this.likedBubbles.has(item.id));
      }
      
      return filtered;
    }
  },
  methods: {
    // --- LIKING FUNCTIONALITY ---
    toggleLike(item) {
      console.log('Toggle like for:', item.id, item.event_name);
      
      if (this.likedBubbles.has(item.id)) {
        // Unlike
        this.likedBubbles.delete(item.id);
        console.log('Unliked:', item.event_name);
      } else {
        // Like
        this.likedBubbles.add(item.id);
        console.log('Liked:', item.event_name);
      }
      
      // Save to localStorage
      this.saveLikesToStorage();
      
      // Regenerate layout to reflect filtering changes
      this.generateNonOverlappingLayout();
      
      // Force reactivity update
      this.$forceUpdate();
    },

    isLiked(bubbleId) {
      return this.likedBubbles.has(bubbleId);
    },

    saveLikesToStorage() {
      try {
        const likesArray = Array.from(this.likedBubbles);
        localStorage.setItem('likedBubbles', JSON.stringify(likesArray));
        console.log('Saved likes to localStorage:', likesArray);
      } catch (error) {
        console.error('Error saving likes to localStorage:', error);
      }
    },

    loadLikesFromStorage() {
      try {
        const saved = localStorage.getItem('likedBubbles');
        if (saved) {
          const likesArray = JSON.parse(saved);
          this.likedBubbles = new Set(likesArray);
          console.log('Loaded likes from localStorage:', likesArray);
        }
      } catch (error) {
        console.error('Error loading likes from localStorage:', error);
        this.likedBubbles = new Set(); // Reset to empty set on error
      }
    },

    clearAllLikes() {
      if (confirm('Are you sure you want to clear all liked bubbles?')) {
        this.likedBubbles.clear();
        this.saveLikesToStorage();
        this.generateNonOverlappingLayout(); // Regenerate layout
        this.$forceUpdate();
        console.log('Cleared all likes');
      }
    },

    // --- BUBBLE SIZE CALCULATION BASED ON TIME DELTA ---
    calculateBubbleSize(item) {
      try {
        const now = new Date();
        const createdAt = new Date(item.bubble_created || item.event_time);
        const eventTime = new Date(item.event_when || item.event_time);
        
        // Calculate time delta in hours
        const totalDeltaMs = Math.abs(eventTime.getTime() - createdAt.getTime());
        const remainingDeltaMs = Math.abs(eventTime.getTime() - now.getTime());
        
        // Calculate urgency ratio (0 = just created, 1 = about to happen)
        const urgencyRatio = totalDeltaMs > 0 ? 
          Math.max(0, Math.min(1, 1 - (remainingDeltaMs / totalDeltaMs))) : 0;
        
        // Size range: 120px (far from event) to 200px (close to event)
        const minSize = 120;
        const maxSize = 200;
        const calculatedSize = minSize + (urgencyRatio * (maxSize - minSize));
        
        console.log(`Bubble ${item.event_name}:`, {
          createdAt: createdAt.toLocaleString(),
          eventTime: eventTime.toLocaleString(),
          now: now.toLocaleString(),
          totalDeltaHours: (totalDeltaMs / (1000 * 60 * 60)).toFixed(2),
          remainingDeltaHours: (remainingDeltaMs / (1000 * 60 * 60)).toFixed(2),
          urgencyRatio: urgencyRatio.toFixed(3),
          size: Math.round(calculatedSize)
        });
        
        return Math.round(calculatedSize);
        
      } catch (error) {
        console.error('Error calculating bubble size for', item.event_name, error);
        return 150; // Default fallback size
      }
    },

    // --- DATA FETCHING & PROCESSING ---
    async fetchBubbles() {
      if (this.loading.fetchAll) return;
      this.loading.fetchAll = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'bubbles'));
        this.sections.forEach((s) => (s.items = [])); // Reset sections
        this.allBubblesData = []; // Reset all bubbles data
        const now = new Date();

        querySnapshot.forEach((doc) => {
          const d = doc.data();
          const type = (d.event_type || 'misc').toString().toLowerCase();

          const item = {
            id: doc.id,
            event_name: d.event_title || 'Unnamed Event',
            event_time: this.normalizeWhen(d.event_when || d.bubble_created),
            event_when: this.normalizeWhen(d.event_when), // Keep original event time
            bubble_created: this.normalizeWhen(d.bubble_created), // Keep creation time
            fullData: d,
            colorClass: this.getColorForType(type)
          };

          // Only add bubbles where the event date hasn't passed yet
          const eventTime = new Date(item.event_when || item.event_time);
          if (eventTime > now) {
            // Add to allBubblesData for filtering and liked modal
            this.allBubblesData.push(item);

            if (type.includes('favour')) this.sections[0].items.push(item);
            else if (type.includes('question')) this.sections[1].items.push(item);
            else this.sections[2].items.push(item);
          } else {
            console.log(`Filtering out expired event: ${item.event_name} (${eventTime.toLocaleString()})`);
          }
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
      
      // Use filtered items instead of all items
      const itemsToPlace = this.filteredItems.slice(0, 10); // Show up to 10 filtered items

      const placedBubbles = [];

      itemsToPlace.forEach(item => {
        // Calculate dynamic size based on time delta
        const bubbleSize = this.calculateBubbleSize(item);
        
        const position = this.findValidPosition(placedBubbles, bubbleSize, containerWidth, containerHeight);

        if (position) {
          placedBubbles.push({
            ...item,
            position: {
              left: `${(position.x / containerWidth) * 100}%`,
              top: `${(position.y / containerHeight) * 100}%`,
            },
            dynamicStyle: {
              width: `${bubbleSize}px`,
              height: `${bubbleSize}px`,
            },
            px: position.x,
            py: position.y,
            diameter: bubbleSize
          });
        }
      });
      
      // Set the positioned items
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

    selectItem(item) {
      this.selectedItem = item;
      console.log('Selected item:', item);
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString(); // Adjust format as needed
    }
  },

  // Watch for filter changes to regenerate layout
  watch: {
    typeFilter() {
      this.generateNonOverlappingLayout();
    },
    likedFilter() {
      this.generateNonOverlappingLayout();
    }
  },

  mounted() {
    console.log('🚀 PrivateBoard mounted, fetching bubbles...');
    
    // Load likes from localStorage first
    this.loadLikesFromStorage();
    
    this.fetchBubbles();
    window.addEventListener('resize', this.generateNonOverlappingLayout);
  },

  beforeUnmount() {
    console.log('PrivateBoard unmounting, cleaning up...');
    window.removeEventListener('resize', this.generateNonOverlappingLayout);
  }
};
</script>

<style scoped>
/* Filter Bar Styles */
.filter-bar {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  z-index: 999;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-section label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin: 0;
}

.filter-section select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.filter-section select:focus {
  outline: none;
  border-color: #eab580;
  box-shadow: 0 0 0 2px rgba(234, 181, 128, 0.2);
}

.filter-stats {
  margin-left: auto;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* Like Button Styles */
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

.like-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.like-btn.liked {
  background: rgba(255, 255, 255, 1);
  animation: heartBeat 0.6s ease;
}

@keyframes heartBeat {
  0% { transform: scale(1); }
  25% { transform: scale(1.2); }
  50% { transform: scale(1); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Liked Counter Styles */
.liked-counter {
  position: fixed;
  bottom: 90px;
  left: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 16px;
  border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1500;
}

.liked-counter span {
  font-weight: 600;
  color: #333;
}

.view-liked-btn {
  background: #ff6b9d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.3s ease;
}

.view-liked-btn:hover {
  background: #e55a8a;
}

/* Liked Modal Styles */
.liked-modal {
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
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-liked {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px;
}

.liked-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.liked-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 12px;
  color: white;
}

.liked-item-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.liked-item-content p {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

.unlike-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.unlike-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: center;
}

.clear-all-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.clear-all-btn:hover {
  background: #ff3742;
}

/* Main layout styles */
.hero.is-light {
  padding-top: 0;
  padding-bottom: 0;
  height: 100vh;
}

.content-container {
  padding-top: 132px; /* Account for topbar (72px) + filter bar (60px) */
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
  transform: translate(-50%, -50%) scale(1.05);
}

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
