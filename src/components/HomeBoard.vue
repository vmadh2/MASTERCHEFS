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
      <router-link
        :to="{ name: 'test' }"
        class="test-btn"
        role="button"
        aria-label="Open test page"
        style="display:flex;align-items:center;justify-content:center"
      >
      Test
      </router-link>
    </div>
  </header>

  <section class="hero is-light">
    <div class="content-container">
      <ul class="list">
        <li v-for="(item, index) in allItems" :key="item.id" class="list-item" :class="{ 'small-event': item.event_name && item.event_name.toLowerCase().includes('halloween lunch') }" :style="{ left: item.position.left, top: item.position.top }" @click="selectItem(item)">
          <div class="item-title">{{ index === 1 ? item.event_name.toUpperCase() : item.event_name }}</div>
          <div class="item-time">{{ index === 1 ? formatCustomTime(item.event_time) : formatTime(item.event_time) }}</div>
        </li>
        <li v-if="allItems.length === 0" class="empty">No items</li>
      </ul>

      <div v-if="selectedItem" class="details">
        <h3>Details for {{ selectedItem.event_name }}</h3>
        <pre>{{ JSON.stringify(selectedItem.fullData, null, 2) }}</pre>
        <button @click="selectedItem = null">Close</button>
      </div>
    </div>
  </section>

  <!-- Bottom bar (fixed) like the screenshot) -->
  <footer class="bottombar">
    <div class="bottombar-inner">
      <div class="bottombar-left">Public</div>
      <router-link
        :to="{ name: 'private-board' }"
        class="bottombar-toggle toggle-track"
        role="switch"
        aria-checked="false"
        tabindex="0"
        aria-label="Toggle visibility between Public and Private"
        @click="(e) => {
          const track = e.currentTarget || e.target;
          const on = track.classList.toggle('is-on');
          track.setAttribute('aria-checked', on);
          const thumb = track.querySelector('.toggle-thumb');
          if (thumb) thumb.style.transform = on ? 'translateX(30px)' : 'translateX(0)';
        }"
        @keydown.enter.prevent="(e) => {
          const track = e.currentTarget || e.target;
          const on = track.classList.toggle('is-on');
          track.setAttribute('aria-checked', on);
          const thumb = track.querySelector('.toggle-thumb');
          if (thumb) thumb.style.transform = on ? 'translateX(30px)' : 'translateX(0)';
        }"
        @keydown.space.prevent="(e) => {
          const track = e.currentTarget || e.target;
          const on = track.classList.toggle('is-on');
          track.setAttribute('aria-checked', on);
          const thumb = track.querySelector('.toggle-thumb');
          if (thumb) thumb.style.transform = on ? 'translateX(30px)' : 'translateX(0)';
        }"
        style="display:flex;align-items:center;justify-content:start"
      >
        <div
          class="toggle-thumb"
          style="transition: transform 0.22s cubic-bezier(.2,.9,.2,1);"
        ></div>
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
        { key: 'news', label: 'Food', items: [] },
        { key: 'events', label: 'Sports', items: [] },
        { key: 'articles', label: 'Hobby', items: [] },
      ],
      loading: { news: false, events: false, articles: false },
      selectedItem: null,
    };
  },
  computed: {
    allItems() {
      // Get all items, shuffle them, and take only 5
      const items = this.sections.flatMap(s => s.items);
      const shuffled = items.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5).map(item => ({
        ...item,
        position: {
          left: `${Math.random() * 80 + 10}%`, // Random position between 10% and 90%
          top: `${Math.random() * 60 + 20}%`    // Random position between 20% and 80%
        }
      }));
    }
  },
  methods: {
    normalizeWhen(value) {
      if (!value) return ''
      if (typeof value === 'object') {
        if (value._seconds) return new Date(value._seconds * 1000).toISOString()
        if (typeof value.toDate === 'function') return value.toDate().toISOString()
      }
      if (typeof value === 'string') return value
      try {
        return new Date(value).toISOString()
      } catch {
        return ''
      }
    },

    formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleString()
    },

    formatCustomTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const seconds = String(d.getSeconds()).padStart(2, '0')
      return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
    },

    async fetchBubbles() {
      this.loading.news = this.loading.events = this.loading.articles = true
      try {
        const querySnapshot = await getDocs(collection(db, 'bubbles'))
        const docs = []
        querySnapshot.forEach((doc) => {
          const d = doc.data()
          docs.push({
            id: doc.id,
            event_type: d.event_type || d.type || null,
            bubble_created: d.bubble_created || d.timestamp || null,
            event_title: d.event_title || d.eventName || d.title || d.name || null,
            event_when: d.event_when || d.when || d.date || d.bubble_created || null,
            x: d.x || null,
            y: d.y || null,
            size: d.size || null,
            color: d.color || null,
            raw: d
          })
        })

        this.sections.forEach((s) => (s.items = []))

        docs.forEach((doc) => {
          const type = (doc.event_type || doc.raw?.event_type || 'misc').toString().toLowerCase()
          const item = {
            id: doc.id,
            event_name:
              doc.event_title || doc.title || doc.raw?.event_title || doc.raw?.title || doc.raw?.name || 'Unnamed Event',
            event_time: this.normalizeWhen(
              doc.event_when || doc.bubble_created || doc.raw?.event_when || doc.raw?.bubble_created
            ),
            fullData: doc
          }

          if (type.includes('food')) this.sections[0].items.push(item)
          else if (type.includes('sport')) this.sections[1].items.push(item)
          else this.sections[2].items.push(item)
        })
      } catch (err) {
        console.error('Failed to fetch bubbles:', err)
      } finally {
        this.loading.news = this.loading.events = this.loading.articles = false
      }
    },

    async loadSection() {
      await this.fetchBubbles()
    },

    async refreshSection(_key) {
      await this.loadSection(_key)
    },

    selectItem(item) {
      this.selectedItem = item
    }
  },
  mounted() {
    this.fetchBubbles()
  },

  beforeUnmount() {
    // No cleanup needed
  },
};


</script>

<style scoped>
/* Ensure hero takes full height minus bars */
.hero.is-light {
  padding-top: 0;
  padding-bottom: 0;
  height: 100vh; /* Initial fallback */
  min-height: 0; /* Prevent min-height from adding space */
  margin: 0;
}

/* Top bar styles */
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #8de3ea; /* soft cyan like photo */
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
  background: #48c0c8;
  color: white;
  font-weight: 700;
  border: none;
  box-shadow: 4px 6px 8px rgba(0,0,0,0.15);
  cursor: pointer;
}
.login-btn:active { transform: translateY(1px); }

.test-btn {
  position: absolute;
  right: 96px; /* sits left of the Post button which is 18px from right */
  top: 12px;
  height: 48px;
  padding: 0 18px;
  border-radius: 10px;
  background: #ffd166; /* warm yellow */
  color: #073642;
  font-weight: 700;
  border: none;
  box-shadow: 4px 6px 8px rgba(0,0,0,0.12);
  cursor: pointer;
}
.test-btn:active { transform: translateY(1px); }

/* Ensure page content appears below the fixed topbar */
.container { padding-top: 1rem; }

/* Bottom bar styles */
.bottombar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 72px;
  background: #8de3ea;
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
}
.bottombar-left, .bottombar-right { color: #073642; }
.bottombar-toggle { display: flex; align-items: center; }
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
}

/* Make bubble-container fill available vertical space between bars */
.hero.is-light { padding-top: 0; padding-bottom: 0; }

.content-container {
  padding: 16px;
  box-sizing: border-box;
  padding-top: 80px; /* below topbar */
  padding-bottom: 80px; /* above bottombar */
  position: relative;
  height: calc(100vh - 144px); /* Full height minus top and bottom bars */
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
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transform: translate(-50%, -50%); /* Center the bubble on its position */
  animation: float 6s ease-in-out infinite;
}

.list-item:nth-child(even) {
  animation: float 8s ease-in-out infinite;
}

.list-item:nth-child(3n) {
  animation: float 7s ease-in-out infinite;
}

.item-title {
  font-weight: 600;
  color: #111;
  font-size: 0.9em;
  line-height: 1.2;
  padding: 0 8px;
}

.item-time {
  font-size: 0.7em;
  color: #666;
  margin-top: 4px;
}

.empty {
  color: #888;
  font-style: italic;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.small-event {
  font-size: 0.6em;
  width: 120px;
  height: 120px;
}

@keyframes float {
  0% {
    transform: translate(-50%, -50%) translateY(0px);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-15px);
  }
  100% {
    transform: translate(-50%, -50%) translateY(0px);
  }
}

.details {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  padding: 16px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  background: #fff;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.details pre {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
}

/* Pastel Colors */
.is-pastel-red {
  background-color: #d75966; /* Light Coral */
}
.is-pastel-green {
  background-color: #4794cf; /* Light Cyan */
}
.is-pastel-blue {
  background-color: #39a551; /* Light Green */
}
</style>
