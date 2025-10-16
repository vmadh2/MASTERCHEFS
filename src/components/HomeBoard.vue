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

  <!-- Speed Detection Notification -->
  <div v-if="speedNotification" class="speed-notification" :class="{ 'show': speedNotification }">
    <div class="notification-content">
      <h3>🚶‍♂️ Speed Detected!</h3>
      <p>Speed: {{ lastDetectedSpeed }} km/h</p>
      <p>Showing {{ currentBubbleCount }} bubbles</p>
      <div class="notification-timer">Resetting in {{ resetCountdown }}s</div>
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
          

        </li>
        <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">No items to display</li>
      </ul>



      <!-- Debug Info (can be removed later) -->
      <div class="debug-info">
        <p>Listening for speed data: {{ speedListener ? 'Active' : 'Inactive' }}</p>
        <p>Current bubble limit: {{ bubbleLimit || 'Default (5)' }}</p>
        <p>Last speed timestamp: {{ lastSpeedTimestamp ? new Date(lastSpeedTimestamp).toLocaleTimeString() : 'None' }}</p>
      </div>

      <!-- Test Button -->
      <button @click="testSpeedConnection" class="test-speed-btn">
        Test Speed Connection
      </button>



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
      bubbleLimit: null, // null means show default bubbles (5)
      resetTimer: null,
      lastSpeedTimestamp: null,
      speedListener: null,
      speedNotification: false,
      lastDetectedSpeed: 0,
      currentBubbleCount: 5,
      resetCountdown: 0,
      countdownTimer: null
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
        
        // If event has passed, use a default smaller size
        if (now > eventTime) {
          console.log(`Event ${item.event_name} has passed, using minimum size`);
          return 200; // Minimum size for past events
        }
        
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
      const speedKph = speedData.speed_kph || 0;
      
      // Determine bubble count based on speed ranges
      let bubbleCount;
      if (speedKph >= 20) {
        // Very fast: show only 2 bubbles
        bubbleCount = 2;
      } else if (speedKph >= 10) {
        // Medium speed: show 4 bubbles
        bubbleCount = 4;
      } else {
        // Slow speed: show all bubbles (default 5)
        bubbleCount = 5;
      }

      console.log(`🚀 Speed: ${speedKph} km/h, showing ${bubbleCount} bubbles`);
      
      // Update notification data
      this.lastDetectedSpeed = speedKph.toFixed(2);
      this.currentBubbleCount = bubbleCount;
      this.speedNotification = true;
      
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
        this.speedNotification = false;
        this.resetCountdown = 0;
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
      const shuffled = allItems.sort(() => 0.5 - Math.random());
      
      // Use bubble limit if set by speed detection, otherwise default to 5
      const itemsToShow = this.bubbleLimit !== null ? this.bubbleLimit : 5;
      const itemsToPlace = shuffled.slice(0, itemsToShow);

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
      
      // CRITICAL: Actually set the positioned items
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

  // --- LIFECYCLE HOOKS ---
  mounted() {
    console.log('🚀 HomeBoard mounted, fetching bubbles...');
    
    this.fetchBubbles();
    window.addEventListener('resize', this.generateNonOverlappingLayout);
    
    // Set up speed monitoring after initial load
    console.log('Setting up speed listener in 2 seconds...');
    setTimeout(() => {
      this.setupSpeedListener();
    }, 2000);
  },

  beforeUnmount() {
    console.log('HomeBoard unmounting, cleaning up...');
    window.removeEventListener('resize', this.generateNonOverlappingLayout);
    
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
  }
};
</script>

<style scoped>
/* Speed Notification Styles */
.speed-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  background: #2d3748;
  color: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  z-index: 2000;
  text-align: center;
  min-width: 300px;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.speed-notification.show {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.notification-content h3 {
  margin: 0 0 12px 0;
  font-size: 1.4em;
  color: #4fd1c7;
}

.notification-content p {
  margin: 8px 0;
  font-size: 1.1em;
}

.notification-timer {
  margin-top: 16px;
  padding: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  font-size: 0.9em;
  color: #a0aec0;
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

/* Top/Bottom Bars */
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

