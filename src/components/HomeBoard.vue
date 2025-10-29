<template>
  <!-- Top bar (fixed) with Richard's improved styling -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="topbar-title">HuddleUp</div>
      <router-link :to="{ name: 'form-sheet' }" class="login-btn" role="button" aria-label="Open form sheet">
        Post
      </router-link>
      <!-- <router-link :to="{ name: 'test' }" class="test-btn" role="button" aria-label="Open test page">
        Test
      </router-link> -->
    </div>
  </header>

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


        </li>
        <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items to display</li>
      </ul>



      <!-- Debug Info (can be removed later) -->
      <div class="debug-info">
        <p>Listening for speed data: {{ speedListener ? 'Active' : 'Inactive' }}</p>
        <p>Current bubble limit: {{ bubbleLimit || 'All bubbles' }}</p>
        <p>Bubbles displayed: {{ positionedItems.length }}</p>
        <div v-if="lastDetectedSpeed > 0" class="speed-info">
          <p><strong>🚶‍♂️ Speed Detection Active</strong></p>
          <p>Speed: {{ lastDetectedSpeed }} km/h</p>
          <p>Showing {{ currentBubbleCount }} bubbles</p>
          <p v-if="resetCountdown > 0">Resetting in {{ resetCountdown }}s</p>
        </div>
        <p>Last speed timestamp: {{ lastSpeedTimestamp ? new Date(lastSpeedTimestamp).toLocaleTimeString() : 'None' }}</p>
      </div>

      <!-- Test Button -->
      <button @click="testSpeedConnection" class="test-speed-btn">
        Test Speed Connection
      </button>



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
    <!-- 💡 NEW: Floating Legend in Bottom Left Corner -->
    <div class="floating-legend">
      <div class="legend-item">
        <span class="legend-dot is-pastel-red"></span> Food
      </div>
      <div class="legend-item">
        <span class="legend-dot is-pastel-blue"></span> Favour
      </div>
      <div class="legend-item">
        <span class="legend-dot is-pastel-green"></span> Activity
      </div>
    </div>
  </footer>
</template>

<script>
import { collection, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
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
      // Speed detection properties
      bubbleLimit: null, // null means show all bubbles
      resetTimer: null,
      lastSpeedTimestamp: null,
      speedListener: null,
      lastDetectedSpeed: 0,
      currentBubbleCount: 5,
      resetCountdown: 0,
      countdownTimer: null,
      // Progressive loading properties
      visibleBubbleCount: 2, // Start with 2 bubbles visible
      progressiveTimer: null
    };
  },
  methods: {
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

    // --- SPEED DETECTION FUNCTIONALITY ---
    setupSpeedListener() {
      console.log('Setting up speed listener...');

      try {
        const speedQuery = query(
          collection(db, 'speed_passes'),
          orderBy('created_at', 'desc'),
          limit(1)
        );

        console.log('📡 Created query, setting up listener...');

        this.speedListener = onSnapshot(speedQuery,
          (snapshot) => {
            console.log('📡 Speed snapshot received');
            console.log('Total docs in snapshot:', snapshot.size);
            console.log('Document changes:', snapshot.docChanges().length);
            console.log('Snapshot empty?', snapshot.empty);

            if (snapshot.empty) {
              console.log('⚠️ Snapshot is empty - no documents found');
              return;
            }

            snapshot.docs.forEach((doc, index) => {
              console.log(`Doc ${index}:`, doc.id, doc.data());
            });

            snapshot.docChanges().forEach((change) => {
              console.log('🔄 Change detected:', {
                type: change.type,
                docId: change.doc.id,
                data: change.doc.data()
              });

              if (change.type === 'added') {
                const data = change.doc.data();
                console.log('🎯 SPEED DATA DETECTED (showing regardless of timestamp):', data);

                // Always handle the speed data - no timestamp checking
                this.handleSpeedData(data);

                // Update timestamp for reference
                const timestamp = data.created_at;
                if (timestamp) {
                  this.lastSpeedTimestamp = timestamp.toMillis ? timestamp.toMillis() : Date.now();
                  console.log('Updated lastSpeedTimestamp:', new Date(this.lastSpeedTimestamp));
                }
              }
            });
          },
          (error) => {
            console.error('❌ Speed listener error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
          }
        );

        console.log('✅ Speed listener setup complete');

      } catch (error) {
        console.error('❌ Error setting up speed listener:', error);
      }
    },

    handleSpeedData(speedData) {
      // Get speed in m/s (assume speed_kph is in km/h, convert to m/s)
      const speedKph = speedData.speed_kph || 0;
      const speedMs = speedKph / 3.6; // Convert km/h to m/s

      // Calculate time to walk 2 meters
      let timeToWalk2m;
      if (speedMs > 0) {
        timeToWalk2m = 2 / speedMs; // seconds
      } else {
        timeToWalk2m = 10; // Default high value for stationary
      }

      // Round up to nearest whole number for bubble count
      const bubbleCount = Math.ceil(timeToWalk2m);

      console.log(`🚶‍♂️ Speed: ${speedKph} km/h (${speedMs.toFixed(2)} m/s), Time for 2m: ${timeToWalk2m.toFixed(2)}s, showing ${bubbleCount} bubbles`);

      // Update speed detection data (no popup)
      this.lastDetectedSpeed = speedKph.toFixed(2);
      this.currentBubbleCount = bubbleCount;

      // Set the bubble limit
      this.bubbleLimit = bubbleCount;

      // Regenerate layout with new bubble count
      this.generateNonOverlappingLayout();

      // Clear any existing timers
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
      }
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }

      // Start countdown
      this.resetCountdown = 5;
      this.countdownTimer = setInterval(() => {
        this.resetCountdown--;
        if (this.resetCountdown <= 0) {
          clearInterval(this.countdownTimer);
        }
      }, 1000);

      // Reset to normal state after 5 seconds
      this.resetTimer = setTimeout(() => {
        this.bubbleLimit = null; // Reset to show default number of bubbles
        this.resetCountdown = 0;
        this.lastDetectedSpeed = 0; // Clear speed detection display
        this.generateNonOverlappingLayout(); // Regenerate with default bubble count
        console.log('✅ Reset to normal bubble display');
      }, 5000);
    },

    async testSpeedConnection() {
      console.log('🔍 Testing direct connection to speed_passes collection...');
      try {
        const speedSnapshot = await getDocs(collection(db, 'speed_passes'));
        console.log('📊 Total speed documents found:', speedSnapshot.size);

        speedSnapshot.forEach((doc) => {
          console.log('📄 Speed doc:', doc.id, doc.data());
        });

        if (speedSnapshot.size > 0) {
          // Get the most recent document manually
          const speedQuery = query(
            collection(db, 'speed_passes'),
            orderBy('created_at', 'desc'),
            limit(1)
          );

          const querySnapshot = await getDocs(speedQuery);
          if (!querySnapshot.empty) {
            const mostRecentDoc = querySnapshot.docs[0];
            console.log('🏆 Most recent speed doc:', mostRecentDoc.id, mostRecentDoc.data());

            // Manually trigger speed detection with this data
            this.handleSpeedData(mostRecentDoc.data());
          }
        } else {
          console.log('❌ No documents found in speed_passes collection');
        }

      } catch (error) {
        console.error('❌ Error testing speed connection:', error);
      }
    },

    // --- FIXED LAYOUT & COLLISION AVOIDANCE ---
    generateNonOverlappingLayout() {
      const container = this.$refs.contentContainer;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const allItems = this.sections.flatMap(s => s.items);

      // Sort items by proximity to current time (closest first)
      const now = new Date();
      allItems.sort((a, b) => {
        const timeA = new Date(a.event_time).getTime();
        const timeB = new Date(b.event_time).getTime();
        return Math.abs(timeA - now.getTime()) - Math.abs(timeB - now.getTime());
      });

      // Use bubble limit if set by speed detection, otherwise show progressive bubble count
      const itemsToShow = this.bubbleLimit !== null ? this.bubbleLimit : this.visibleBubbleCount;
      const itemsToPlace = allItems.slice(0, itemsToShow);

      const placedBubbles = [];

      itemsToPlace.forEach(item => {
        // Calculate dynamic size based on time delta
        const bubbleSize = this.calculateBubbleSize(item);

        // Use larger bubble size when speed detection is active, otherwise use Richard's fixed size
        const fixedSize = this.bubbleLimit !== null ? 220 : 160;
        const position = this.findValidPosition(placedBubbles, fixedSize, containerWidth, containerHeight);

        if (position) {
          placedBubbles.push({
            ...item,
            position: {
              left: `${(position.x / containerWidth) * 100}%`,
              top: `${(position.y / containerHeight) * 100}%`,
            },
            px: position.x,
            py: position.y,
            diameter: fixedSize
          });
        }
      });

      // CRITICAL: Actually set the positioned items
      this.positionedItems = placedBubbles;
    },

    findValidPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const maxTries = 200; // Increased attempts for better placement
      const radius = diameter / 2;
      const padding = 30; // Increased padding between bubbles

      // Safe zone boundaries (container is already constrained by fixed positioning)
      const sideMargin = 20;   // Margin from screen edges

      // Calculate safe positioning area
      const safeLeft = sideMargin + radius;
      const safeRight = containerWidth - sideMargin - radius;
      const safeTop = radius + 10; // Small top buffer
      const safeBottom = containerHeight - radius - 10; // Small bottom buffer

      // Ensure we have a valid safe area
      const safeWidth = safeRight - safeLeft;
      const safeHeight = safeBottom - safeTop;

      if (safeWidth <= 0 || safeHeight <= 0) {
        console.warn('Safe area too small for bubble placement');
        return null;
      }

      for (let i = 0; i < maxTries; i++) {
        // Generate random position within safe boundaries
        const x = Math.random() * safeWidth + safeLeft;
        const y = Math.random() * safeHeight + safeTop;

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

        if (!hasOverlap) {
          console.log(`Bubble placed at safe position: x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
          return { x, y };
        }
      }

      // Improved fallback: use grid-based positioning if random fails
      console.warn('Random placement failed, using grid fallback');
      return this.findGridPosition(placedBubbles, diameter, containerWidth, containerHeight);
    },

    findGridPosition(placedBubbles, diameter, containerWidth, containerHeight) {
      const radius = diameter / 2;
      const padding = 30;

      // Safe zone boundaries (container is already constrained by fixed positioning)
      const sideMargin = 20;

      const safeLeft = sideMargin + radius;
      const safeRight = containerWidth - sideMargin - radius;
      const safeTop = radius + 10;
      const safeBottom = containerHeight - radius - 10;

      // Create a grid of potential positions
      const gridSpacing = diameter + padding;
      const cols = Math.floor((safeRight - safeLeft) / gridSpacing);
      const rows = Math.floor((safeBottom - safeTop) / gridSpacing);

      // Try each grid position
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = safeLeft + (col * gridSpacing);
          const y = safeTop + (row * gridSpacing);

          // Check if this position overlaps with any existing bubble
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

          if (!hasOverlap) {
            console.log(`Grid placement successful at: x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
            return { x, y };
          }
        }
      }

      // No valid grid position found, return null to avoid overlap
      console.warn('Grid placement also failed, no valid position found');
      return null;
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

  // --- LIFECYCLE HOOKS ---
  mounted() {
    console.log('🚀 HomeBoard mounted, fetching bubbles...');

    this.fetchBubbles();

    // Debounced resize handler to prevent excessive recalculations
    this.resizeHandler = this.debounce(() => {
      console.log('🔄 Window resized, repositioning bubbles...');
      this.generateNonOverlappingLayout();
    }, 300);

    window.addEventListener('resize', this.resizeHandler);

    // Set up speed monitoring after initial load
    console.log('Setting up speed listener in 2 seconds...');
    setTimeout(() => {
      this.setupSpeedListener();
    }, 2000);

    
    // // === PROGRESSIVE BUBBLE LOADING ===
    // // Start with 2 bubbles, then add one every 30 seconds up to 5
    // // To disable this feature, comment out or remove this entire block
    // this.progressiveTimer = setInterval(() => {
    //   if (this.visibleBubbleCount < 5) {
    //     this.visibleBubbleCount++;
    //     this.generateNonOverlappingLayout();
    //     console.log(`Progressive loading: Now showing ${this.visibleBubbleCount} bubbles`);
    //   }
    // }, 10000); // 10 seconds
    // // === END PROGRESSIVE BUBBLE LOADING ===
    
  },

  beforeUnmount() {
    console.log('HomeBoard unmounting, cleaning up...');

    // Clean up resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    // Clean up listeners and timers
    if (this.speedListener) {
      this.speedListener();
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (this.progressiveTimer) {
      clearInterval(this.progressiveTimer);
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

/* Debug Info Styles */
.debug-info {
  position: fixed;
  top: 90px;
  right: 20px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.8em;
  font-family: monospace;
  z-index: 1500;
  min-width: 250px;
}

.debug-info p {
  margin: 4px 0;
}

.speed-info {
  background: rgba(16, 185, 129, 0.2);
  padding: 8px;
  border-radius: 4px;
  margin: 8px 0;
  border-left: 3px solid #10b981;
}

.speed-info p {
  margin: 2px 0;
}

.speed-info strong {
  color: #4fd1c7;
}

/* Test Button Styles */
.test-speed-btn {
  position: fixed;
  top: 200px;
  right: 20px;
  z-index: 2000;
  padding: 10px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

/* Richard's Complete Styling */
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
  overflow: hidden;
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

/* Speed Detection Enhancement */
.list-item.speed-detected {
  animation: float 8s ease-in-out infinite alternate,
             speedPulse 1.5s infinite,
             speedGlow 2s ease-in-out infinite alternate;
  border: 3px solid #10b981;
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.5),
              0 6px 25px rgba(0, 0, 0, 0.2);
}

@keyframes speedPulse {
  0% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.5),
                0 6px 25px rgba(0, 0, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 40px rgba(16, 185, 129, 0.8),
                0 8px 30px rgba(0, 0, 0, 0.25);
  }
  100% {
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.5),
                0 6px 25px rgba(0, 0, 0, 0.2);
  }
}

@keyframes speedGlow {
  from {
    border-color: #10b981;
  }
  to {
    border-color: #34d399;
  }
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

/* Details modal styles */
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

/* Richard's float animation */
@keyframes float {
  from {
    transform: translate(-50%, -50%) translateY(0px) rotate(-3deg);
  }
  to {
    transform: translate(-50%, -50%) translateY(-20px) rotate(3deg);
  }
}

/* Top/Bottom Bars - Richard's styling */
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

</style>

