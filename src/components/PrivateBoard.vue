<template>
  <div>
    <!-- Top bar (fixed) -->
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
          <option value="activity">Activity</option>
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
        <div class="filter-section">
          <label>Filter by Ownership:</label>
          <select v-model="ownershipFilter">
            <option value="all">All</option>
            <option value="mine">My Bubbles</option>
            <option value="others">Others’ Bubbles</option>
          </select>
        </div>
      </div>
      <div class="filter-stats">
        Showing {{ positionedItems.length }} of {{ allBubblesData.length }} bubbles
      </div>
    </div>

    <section class="hero is-light">
      <div class="content-container" ref="contentContainer">
        <ul class="list">
          <li
            v-for="item in positionedItems"
            :key="item.id"
            class="list-item"
            :class="[item.colorClass, item.sizeClass]"
            :style="{
              ...item.position,
              border: item.fullData.created_by === userToken ? '3px solid #ffd166' : 'none',
            }"
            @click="selectItem(item)"
          >
            <div class="item-title">{{ item.event_name }}</div>
            <div class="item-time">{{ formatTime(item.event_time) }}</div>
            <div class="item-time">{{ item.event_author }}</div>
            <button
              class="like-btn"
              :class="{ liked: isLiked(item.id) }"
              @click.stop="toggleLike(item)"
              :title="isLiked(item.id) ? 'Unlike' : 'Like'"
            >
              {{ isLiked(item.id) ? '❤️' : '🤍' }}
            </button>
            <button
              v-if="item.fullData.created_by === userToken"
              class="delete-btn"
              title="Delete your post"
              @click.stop="deleteBubble(item.id)"
            >
              🗑️
            </button>
          </li>
          <li v-if="positionedItems.length === 0 && !loading.fetchAll" class="empty">
            No items match filters
          </li>
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
                <div
                  v-for="bubble in likedBubblesData"
                  :key="bubble.id"
                  class="liked-item"
                  :class="bubble.colorClass"
                >
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

        <!-- Details Panel -->
        <div v-if="selectedItem" class="details-overlay" @click.self="selectedItem = null">
          <div class="details-card">
            <div class="details-header">
              <h3>{{ selectedItem.fullData.event_title }}</h3>
              <button @click="selectedItem = null" class="close-btn-modal">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span
                  >Posted by: <strong>{{ selectedItem.fullData.author_name }}</strong></span
                >
              </div>
              <div class="meta-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span
                  >Event on:
                  <strong>{{ formatDetailedTime(selectedItem.event_time) }}</strong></span
                >
              </div>
              <div class="meta-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                  ></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span
                  >Contact: <strong>{{ selectedItem.fullData.author_contact }}</strong></span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Floating Legend -->
        <div class="floating-legend">
          <div class="legend-item"><span class="legend-dot is-pastel-red"></span> Favour</div>
          <div class="legend-item"><span class="legend-dot is-pastel-blue"></span> Activity</div>
          <div class="legend-item">
            <span class="legend-dot is-pastel-green"></span> Announcement
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Bar -->
    <footer class="bottombar">
      <div class="bottombar-inner">
        <div class="bottombar-left">Public</div>
        <router-link
          :to="{ name: 'home-board' }"
          class="bottombar-toggle toggle-track"
          role="switch"
          aria-checked="true"
          tabindex="0"
          aria-label="Toggle to Public board"
        >
          <div class="toggle-thumb private-thumb"></div>
        </router-link>
        <div class="bottombar-right">Private</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase.js' // Ensure this path is correct

// --- Reactive State ---
const allBubblesData = ref([])
const positionedItems = ref([])
const loading = ref({ fetchAll: false })
const selectedItem = ref(null)
const likedBubbles = ref(new Set())
const showLikedModal = ref(false)
const typeFilter = ref('all')
const likedFilter = ref('all')
const ownershipFilter = ref('all')
const contentContainer = ref(null)
const userToken = ref(localStorage.getItem('userToken') || null)
if (!userToken.value) {
  userToken.value = crypto.randomUUID()
  localStorage.setItem('userToken', userToken.value)
}

// --- Computed Properties ---
const likedBubblesData = computed(() => {
  return allBubblesData.value.filter((bubble) => likedBubbles.value.has(bubble.id))
})

const filteredItems = computed(() => {
  let filtered = [...allBubblesData.value]
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter((item) => {
      const type = (item.fullData.event_type || 'misc').toString().toLowerCase()
      if (typeFilter.value === 'favour' && type.includes('favour')) return true
      if (typeFilter.value === 'activity' && type.includes('activity')) return true
      if (typeFilter.value === 'announcement' && type.includes('announcement')) return true
      return false
    })
  }
  if (likedFilter.value === 'liked') {
    filtered = filtered.filter((item) => isLiked(item.id))
  } else if (likedFilter.value === 'unliked') {
    filtered = filtered.filter((item) => !isLiked(item.id))
  }

  if (ownershipFilter.value === 'mine') {
    filtered = filtered.filter((item) => item.fullData.created_by === userToken.value)
  } else if (ownershipFilter.value === 'others') {
    filtered = filtered.filter((item) => item.fullData.created_by !== userToken.value)
  }
  return filtered
})

// --- Methods ---
const toggleLike = (item) => {
  if (likedBubbles.value.has(item.id)) {
    likedBubbles.value.delete(item.id)
  } else {
    likedBubbles.value.add(item.id)
  }
  saveLikesToStorage()
}

const isLiked = (bubbleId) => likedBubbles.value.has(bubbleId)
const saveLikesToStorage = () =>
  localStorage.setItem('likedBubbles', JSON.stringify(Array.from(likedBubbles.value)))
const loadLikesFromStorage = () => {
  const saved = localStorage.getItem('likedBubbles')
  if (saved) {
    likedBubbles.value = new Set(JSON.parse(saved))
  }
}
const clearAllLikes = () => {
  if (confirm('Are you sure you want to clear all liked bubbles?')) {
    likedBubbles.value.clear()
    saveLikesToStorage()

    // Only regenerate layout if filtering by liked status
    if (likedFilter.value !== 'all') {
      generateNonOverlappingLayout()
    }

    console.log('Cleared all likes')
  }
}
const getBubbleSize = (eventTime) => {
  const now = new Date();
  const eventDate = new Date(eventTime);

  if (isNaN(eventDate.getTime())) {
    // fallback if time is invalid
    return { class: 'size-s', diameter: 150 };
  }

  const diffMs = eventDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // --- 3-tier urgency system ---
  if (diffHours <= 24) {
    // Due within 1 day
    return { class: 'size-l', diameter: 225 };
  } else if (diffHours <= 72) {
    // Due within 3 days
    return { class: 'size-m', diameter: 200 };
  } else {
    // More than 3 days away
    return { class: 'size-s', diameter: 150 };
  }
};

const fetchBubbles = async () => {
  if (loading.value.fetchAll) return
  loading.value.fetchAll = true
  try {
    const querySnapshot = await getDocs(collection(db, 'bubbles'))
    const bubbles = []
    const now = new Date() // Get current time once

    querySnapshot.forEach((doc) => {
      const d = doc.data()
      if (!d.created_by) {
        console.warn(`Bubble ${doc.id} missing 'created_by' field.`)
      }

      const type = (d.event_type || 'misc').toString().toLowerCase()
      const eventName = d.event_title || 'Unnamed Event'
      const eventAuthor = d.author_name
      const eventTimeISO = normalizeWhen(d.event_when || d.bubble_created) // Normalize the event time
      const eventTime = eventTimeISO ? new Date(eventTimeISO) : null // Create Date object

      // --- 💡 REINSERTED: Filter out expired events ---
      if (eventTime && eventTime > now) {
        bubbles.push({
          id: doc.id,
          event_name: eventName,
          event_author: eventAuthor,
          event_time: eventTimeISO, // Store the normalized ISO string
          fullData: d,
          colorClass: getColorForType(type),
          sizeInfo: getBubbleSize(eventTimeISO),
        })
      } else {
        console.log(
          `Filtering out expired or invalid event: ${eventName} (${eventTime ? eventTime.toLocaleString() : 'Invalid Date'})`,
        )
      }
    })
    allBubblesData.value = bubbles // Update allBubblesData with ONLY non-expired items
    generateNonOverlappingLayout()
  } catch (err) {
    console.error('Failed to fetch bubbles:', err)
  } finally {
    loading.value.fetchAll = false
  }
}

const generateNonOverlappingLayout = () => {
  const container = contentContainer.value
  if (!container) return
  const { clientWidth: containerWidth, clientHeight: containerHeight } = container
  const itemsToPlace = filteredItems.value.slice(0, 10)
  const placedBubbles = []
  itemsToPlace.forEach((item) => {
    const bubbleDiameter = item.sizeInfo.diameter
    const position = findValidPosition(
      placedBubbles,
      bubbleDiameter,
      containerWidth,
      containerHeight,
    )
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
        diameter: bubbleDiameter,
      })
    }
  })
  positionedItems.value = placedBubbles
}

const findValidPosition = (placedBubbles, diameter, containerWidth, containerHeight) => {
  const maxTries = 200
  const radius = diameter / 2
  const padding = 20

  // Define safe zones (avoid UI elements)
  const topMargin = 20 // Top buffer
  const bottomMargin = 150 // Space for legend (90px from bottom + 60px legend height)
  const sideMargin = 20 // Left/right margins

  // Calculate safe positioning area
  const safeLeft = sideMargin + radius
  const safeRight = containerWidth - sideMargin - radius
  const safeTop = topMargin + radius
  const safeBottom = containerHeight - bottomMargin - radius

  const safeWidth = safeRight - safeLeft
  const safeHeight = safeBottom - safeTop

  if (safeWidth <= 0 || safeHeight <= 0) {
    console.warn('Safe area too small for bubble placement')
    return null
  }

  for (let i = 0; i < maxTries; i++) {
    // Generate position within safe boundaries
    const x = Math.random() * safeWidth + safeLeft
    const y = Math.random() * safeHeight + safeTop

    let hasOverlap = false

    // Check collision with other bubbles
    for (const placed of placedBubbles) {
      const dx = x - placed.px
      const dy = y - placed.py
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < radius + placed.diameter / 2 + padding) {
        hasOverlap = true
        break
      }
    }

    if (!hasOverlap) {
      console.log(`✅ Bubble placed at safe position: x=${x.toFixed(1)}, y=${y.toFixed(1)}`)
      return { x, y }
    }
  }

  // Fallback: try grid-based placement
  console.warn('Random placement failed, using grid fallback')
  return findGridPosition(placedBubbles, diameter, containerWidth, containerHeight)
}

const findGridPosition = (placedBubbles, diameter, containerWidth, containerHeight) => {
  const radius = diameter / 2
  const padding = 20

  // Use same safe zones as findValidPosition
  const topMargin = 20
  const bottomMargin = 150
  const sideMargin = 20

  const safeLeft = sideMargin + radius
  const safeRight = containerWidth - sideMargin - radius
  const safeTop = topMargin + radius
  const safeBottom = containerHeight - bottomMargin - radius

  // Create a grid of potential positions
  const gridSpacing = diameter + padding
  const cols = Math.floor((safeRight - safeLeft) / gridSpacing)
  const rows = Math.floor((safeBottom - safeTop) / gridSpacing)

  // Try each grid position
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = safeLeft + col * gridSpacing
      const y = safeTop + row * gridSpacing

      // Check if this position overlaps with any existing bubble
      let hasOverlap = false
      for (const placed of placedBubbles) {
        const dx = x - placed.px
        const dy = y - placed.py
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = radius + placed.diameter / 2 + padding

        if (distance < minDistance) {
          hasOverlap = true
          break
        }
      }

      if (!hasOverlap) {
        console.log(`Grid placement successful at: x=${x.toFixed(1)}, y=${y.toFixed(1)}`)
        return { x, y }
      }
    }
  }

  // Ultimate fallback: center position (avoiding legend)
  console.warn('Grid placement also failed, using center fallback')
  return {
    x: containerWidth / 2,
    y: (safeTop + safeBottom) / 2, // Center vertically within safe zone
  }
}
const getColorForType = (type) => {
  if (type.includes('favour')) return 'is-pastel-red'
  if (type.includes('activity')) return 'is-pastel-blue'
  return 'is-pastel-green'
}
const normalizeWhen = (value) => {
  if (!value) return ''
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  try {
    return new Date(value).toISOString()
  } catch {
    return ''
  }
}
const selectItem = (item) => {
  selectedItem.value = item
}
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const formatDetailedTime = (iso) => {
  if (!iso) return 'Not specified'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Invalid Date'
  return d.toLocaleString('en-AU', { dateStyle: 'full', timeStyle: 'short' })
}
const deleteBubble = async (bubbleId) => {
  const confirmDelete = confirm('Are you sure?')
  if (!confirmDelete) return
  try {
    await deleteDoc(doc(db, 'bubbles', bubbleId))
    alert('Bubble deleted!')
    await fetchBubbles()
  } catch (err) {
    console.error('Error deleting:', err)
    alert('Failed to delete.')
  }
}

// --- Watchers ---
watch(typeFilter, generateNonOverlappingLayout)
watch(likedFilter, generateNonOverlappingLayout)
watch(ownershipFilter, generateNonOverlappingLayout)

// --- Lifecycle Hooks ---
let resizeHandler = null
onMounted(() => {
  loadLikesFromStorage()
  nextTick(() => {
    fetchBubbles()
    resizeHandler = () => generateNonOverlappingLayout()
    window.addEventListener('resize', resizeHandler)
  })
})
onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<style scoped>
/* All styles remain exactly the same */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
:global(body) {
  font-family: 'Poppins', sans-serif;
}

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
  z-index: 2000;
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
.close-btn-modal {
  background: none;
  border: none;
  cursor: pointer;
  color: #a0aec0;
  padding: 4px;
}
.close-btn-modal:hover {
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
.filter-bar {
  position: fixed;
  top: 72px;
  left: 0;
  right: 0;
  background: #fdfcfa;
  border-bottom: 1px solid #f0e9e1;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  z-index: 999;
  height: 60px;
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
.like-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  z-index: 10;
}
.like-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 1);
}
.like-btn.liked {
  animation: heartBeat 0.6s ease;
}
@keyframes heartBeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}
.liked-counter {
  position: fixed;
  bottom: 90px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 15px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1500;
}
.liked-counter span {
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
}
.view-liked-btn {
  background: #ff6b9d;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 15px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: 600;
}
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
} /* Close button for liked modal */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.no-liked,
.liked-list,
.liked-item,
.liked-item-content,
.unlike-btn,
.modal-footer,
.clear-all-btn {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px 0;
}
.liked-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  text-align: left;
  font-style: normal;
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
}
.hero.is-light {
  padding: 0;
  margin: 0;
  height: 100vh;
  background-color: #f7f9fc;
  background-image: url('data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23dce7f0" fill-opacity="0.6" fill-rule="evenodd"%3E%3Cpath d="M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z"/%3E%3C/g%3E%3C/svg%3E');
}
.content-container {
  position: fixed;
  top: 132px;
  bottom: 72px;
  left: 0;
  right: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding: 20px;
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
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  animation: float 10s ease-in-out infinite alternate;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.list-item:hover {
  animation-play-state: paused;
  transform: translate(-50%, -50%) scale(1.5); /* Slightly bigger scale */
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.08), 0 25px 50px rgba(45, 55, 72, 0.15);
  filter: brightness(1.05); /* Subtle brightness boost */
}

.list-item:hover::after {
  content: "Click for details";
  position: absolute;
  bottom: -30px;
  font-weight: bold;
  font-size: 12px;
  color: #666;
  opacity: 0.8;
}
.size-s {
  width: 150px;
  height: 150px;
  font-size: 0.9em;
}
.size-m {
  width: 200px;
  height: 200px;
  font-size: 1em;
}
.size-l {
  width: 230px;
  height: 230px;
  font-size: 1.1em;
}
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
.is-pastel-red {
  background: linear-gradient(135deg, #ff8a80, #ff5252);
}
.is-pastel-blue {
  background: linear-gradient(135deg, #89cff0, #6495ed);
} /* Activity */
.is-pastel-green {
  background: linear-gradient(135deg, #69f0ae, #00c853);
} /* Announcement */
@keyframes float {
  from {
    transform: translate(-50%, -50%) translateY(0px);
  }
  to {
    transform: translate(-50%, -50%) translateY(-20px);
  }
}
.topbar,
.bottombar {
  position: fixed;
  left: 0;
  right: 0;
  height: 72px;
  background: #eab580;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  font-weight: bold;
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
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bottombar {
  bottom: 0;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}
.bottombar-inner {
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 18px;
  font-weight: 600;
}
.toggle-group {
  display: flex;
  align-items: center;
  gap: 12px;
} /* Wrapper for toggle */
.bottombar-left,
.bottombar-right {
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
  transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.2, 1);
  position: absolute;
  left: 2px;
}
.private-thumb {
  transform: translateX(30px);
}

/* --- 💡 NEW: Styles for the floating legend --- */
.floating-legend {
  position: fixed;
  bottom: 90px;
  right: 20px; /* Position from left padding */
  background: rgba(255, 255, 255, 0.3); /* Semi-transparent white */
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

/* --- NEW: Delete Button Styles --- */
.delete-btn {
  position: absolute;
  bottom: 5px; /* Position near the bottom */
  right: 5px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 80, 80, 0.8); /* Red background */
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 11; /* Above like button */
  opacity: 0.7; /* Slightly transparent */
}
.delete-btn:hover {
  background: rgba(220, 40, 40, 1); /* Darker red on hover */
  transform: scale(1.1);
  opacity: 1; /* Fully opaque on hover */
}
</style>
