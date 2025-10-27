<template>
  <div class="private-board-wrapper">
  <!-- Top bar (fixed) matching provided design -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-title">HuddleUp</div>
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
      Showing {{ positionedItems.length }} of {{ filteredItems.length }} filtered
      ({{ allBubblesData.length }} total) | ❤️ {{ likedBubbles.size }} liked
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

      <!-- Richard's Beautiful Details Modal -->
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
            <div v-if="isLiked(selectedItem.id)" class="meta-item">
              <span style="color: #e53e3e; font-weight: 600;">❤️ Liked Event</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>



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
    <!-- 💡 NEW: Floating Legend in Bottom Left Corner -->
    <div class="floating-legend">
      <div class="legend-item">
        <span class="legend-dot is-pastel-red"></span> Favour
      </div>
      <div class="legend-item">
        <span class="legend-dot is-pastel-blue"></span> Question
      </div>
      <div class="legend-item">
        <span class="legend-dot is-pastel-green"></span> Announcement
      </div>
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

      // Only regenerate layout if we're filtering by liked status
      // This prevents unnecessary repositioning when just liking/unliking
      if (this.likedFilter !== 'all') {
        this.generateNonOverlappingLayout();
      }

      // Force reactivity update for like buttons and counters
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

        // Only regenerate layout if we're filtering by liked status
        if (this.likedFilter !== 'all') {
          this.generateNonOverlappingLayout();
        }

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
      if (!container) {
        console.warn('Container not found for bubble positioning');
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      console.log(`Container dimensions: ${containerWidth}x${containerHeight}`);

      // Use filtered items instead of all items
      const itemsToPlace = this.filteredItems.slice(0, 8); // Reduced to 8 for better spacing

      const placedBubbles = [];

      itemsToPlace.forEach((item, index) => {
        // Use Richard's fixed bubble size
        const fixedSize = 160;
        const position = this.findValidPosition(placedBubbles, fixedSize, containerWidth, containerHeight);

        if (position) {
          // Convert to percentage positioning but keep pixel values for collision detection
          const leftPercent = (position.x / containerWidth) * 100;
          const topPercent = (position.y / containerHeight) * 100;

          placedBubbles.push({
            ...item,
            position: {
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
            },
            px: position.x,
            py: position.y,
            diameter: fixedSize
          });

          console.log(`Placed bubble ${index + 1}: ${leftPercent.toFixed(1)}%, ${topPercent.toFixed(1)}%`);
        } else {
          console.warn(`Failed to place bubble ${item.event_name}`);
        }
      });

      // Set the positioned items
      this.positionedItems = placedBubbles;
      console.log(`Total bubbles placed: ${placedBubbles.length} out of ${itemsToPlace.length}`);
    },

    findValidPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const radius = diameter / 2;
      const padding = 30; // Increased padding for better spacing

      // Safe zone boundaries - more conservative margins
      const sideMargin = 30;
      const topMargin = 30;
      const bottomMargin = 30;

      // Calculate safe positioning area
      const safeLeft = sideMargin + radius;
      const safeRight = containerWidth - sideMargin - radius;
      const safeTop = topMargin + radius;
      const safeBottom = containerHeight - bottomMargin - radius;

      const safeWidth = safeRight - safeLeft;
      const safeHeight = safeBottom - safeTop;

      console.log(`Safe area: ${safeWidth}x${safeHeight} (${safeLeft}, ${safeTop} to ${safeRight}, ${safeBottom})`);

      if (safeWidth <= 0 || safeHeight <= 0) {
        console.warn('Safe area too small for bubble placement');
        return null;
      }

      // Try grid-based placement first for more predictable results
      const gridPosition = this.findGridPosition(placedBubbles, diameter, containerWidth, containerHeight);
      if (gridPosition) {
        return gridPosition;
      }

      // Fallback to random placement with fewer attempts
      const maxTries = 50;
      for (let i = 0; i < maxTries; i++) {
        const x = Math.random() * safeWidth + safeLeft;
        const y = Math.random() * safeHeight + safeTop;

        if (this.isPositionValid(x, y, radius, placedBubbles, padding)) {
          console.log(`Random placement successful: x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
          return { x, y };
        }
      }

      console.warn('All placement attempts failed');
      return null;
    },

    findGridPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const radius = diameter / 2;
      const padding = 30;

      // Safe zone boundaries - match the main positioning logic
      const sideMargin = 30;
      const topMargin = 30;
      const bottomMargin = 30;

      const safeLeft = sideMargin + radius;
      const safeRight = containerWidth - sideMargin - radius;
      const safeTop = topMargin + radius;
      const safeBottom = containerHeight - bottomMargin - radius;

      // Create a more flexible grid
      const gridSpacing = diameter + padding;
      const cols = Math.max(1, Math.floor((safeRight - safeLeft) / gridSpacing));
      const rows = Math.max(1, Math.floor((safeBottom - safeTop) / gridSpacing));

      console.log(`Grid: ${cols}x${rows}, spacing: ${gridSpacing}`);

      // Create array of all grid positions and shuffle them for variety
      const positions = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = safeLeft + (col * gridSpacing) + (Math.random() - 0.5) * 20; // Add small random offset
          const y = safeTop + (row * gridSpacing) + (Math.random() - 0.5) * 20;
          positions.push({ x, y });
        }
      }

      // Shuffle positions for variety
      positions.sort(() => Math.random() - 0.5);

      // Try each grid position
      for (const pos of positions) {
        if (this.isPositionValid(pos.x, pos.y, radius, placedBubbles, padding)) {
          console.log(`Grid placement successful at: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}`);
          return pos;
        }
      }

      console.warn('Grid placement failed');
      return null;
    },

    isPositionValid(x, y, radius, placedBubbles, padding) {
      for (const placed of placedBubbles) {
        const dx = x - placed.px;
        const dy = y - placed.py;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (radius + placed.diameter / 2) + padding;

        if (distance < minDistance) {
          return false;
        }
      }
      return true;
    },

    // --- HELPERS ---
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

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
      return date.toLocaleDateString('en-AU'); // Richard's improved format
    },

    // Richard's detailed formatter for the modal
    formatDetailedTime(iso) {
      if (!iso) return 'Not specified';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleString('en-AU', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
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

    // Debounced resize handler to prevent excessive recalculations
    this.resizeHandler = this.debounce(() => {
      console.log('🔄 PrivateBoard window resized, repositioning bubbles...');
      this.generateNonOverlappingLayout();
    }, 300);

    window.addEventListener('resize', this.resizeHandler);

    // Ensure layout is generated after DOM is fully rendered
    this.$nextTick(() => {
      setTimeout(() => {
        this.generateNonOverlappingLayout();
      }, 100);
    });
  },

  beforeUnmount() {
    console.log('PrivateBoard unmounting, cleaning up...');

    // Clean up resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

:global(body) {
  font-family: 'Poppins', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Private Board Wrapper - Force complete background coverage */
.private-board-wrapper {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-color: #8b9dc3 !important;
  background-image: url('data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23dbe7fd" fill-opacity="0.6" fill-rule="evenodd"%3E%3Cpath d="M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z"/%3E%3C/g%3E%3C/svg%3E') !important;
  z-index: 0 !important;
  overflow: hidden !important;
}

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

/* Richard's Beautiful Details Modal Styles */
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

.details-header .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #a0aec0;
  padding: 4px;
}

.details-header .close-btn:hover {
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

/* Main layout styles with Richard's background - force override */
.hero.is-light {
  padding: 0 !important;
  margin: 0 !important;
  height: 100vh !important;
  background-color: #8b9dc3 !important;
  background-image: url('data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23dbe7fd" fill-opacity="0.6" fill-rule="evenodd"%3E%3Cpath d="M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z"/%3E%3C/g%3E%3C/svg%3E') !important;
}

/* Force override global body background for this component */
:global(body) {
  background-color: #8b9dc3 !important;
}

.content-container {
  position: fixed !important;
  top: 144px !important;
  bottom: 84px !important;
  left: 12px !important;
  right: 12px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  padding: 0 !important;
  background: transparent !important;
  z-index: 1 !important;
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
  animation: float 10s ease-in-out infinite alternate;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  /* Center the bubble on its position coordinates */
  transform: translate(-50%, -50%);
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



/* Richard's color scheme */
.is-pastel-red {
  background: linear-gradient(145deg, #FF9A8B, #FF6A88);
}

.is-pastel-blue {
  background: linear-gradient(145deg, #89CFF0, #6495ED);
}

.is-pastel-green {
  background: linear-gradient(145deg, #98FB98, #55C595);
}

/* Richard's PrivateBoard float animation - centered positioning */
@keyframes float {
  from {
    transform: translate(-50%, -50%) translateY(0px);
  }
  to {
    transform: translate(-50%, -50%) translateY(-15px);
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
  font-weight: bold;
  font-size: 20px;
  color: #073642;
}
.login-btn {
  position: absolute;
  right: 18px;
  top: 12px;
  height: 48px;
  padding: 0 24px;
  border-radius: 10px;
  background: #a16d3a;
  color: white;
  font-weight: 700;
  border: none;
  box-shadow: 4px 6px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
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
  font-weight: bold;
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

/* --- 💡 NEW: Styles for the floating legend --- */
.floating-legend {
  position: fixed;
  bottom: 90px;
  right: 20px; /* Position from left padding */
  background: rgba(255, 255, 255, 0.85); /* Semi-transparent white */
  backdrop-filter: blur(5px);
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column; /* Stack items vertically */
  gap: 8px; /* Space between items */
  z-index: 500; /* Ensure it's above background but below modal */
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  /* Colors are applied via is-pastel-* classes */
}

.legend-item span {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748; /* Darker text for readability */
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
