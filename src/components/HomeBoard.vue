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
    <div class="bubble-container" ref="bubbleContainer">
      <div
        v-for="bubble in bubbles"
        :key="bubble.id"
        class="bubble"
        :style="{
          left: bubble.x + 'px',
          top: bubble.y + 'px',
          width: bubble.size + 'px',
          height: bubble.size + 'px',
          backgroundColor: bubble.color,
          animation: 'float 6s ease-in-out infinite',
          animationDelay: bubble.delay + 's'
        }"
        @click="selectBubble(bubble)"
      >
        {{ bubble.event_title || bubble.id }}
      </div>
      <div v-if="loading.bubbles" class="loading">Loading bubbles…</div>
    </div>
  </section>
  
  <!-- Bottom bar (fixed) like the screenshot) -->
  <footer class="bottombar">
    <div class="bottombar-inner">
      <div class="bottombar-left">Public</div>
      <div class="bottombar-toggle" role="switch" aria-checked="false">
        <div
          class="toggle-track"
          role="switch"
          aria-checked="false"
          tabindex="0"
          aria-label="Toggle visibility between Public and Private"
          onclick="(function(e){
            const track = e.currentTarget || e.target;
            const on = track.classList.toggle('is-on');
            track.setAttribute('aria-checked', on);
            const thumb = track.querySelector('.toggle-thumb');
            if (thumb) thumb.style.transform = on ? 'translateX(30px)' : 'translateX(0)';
          })(event)"
          onkeydown="if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            (function(e){
              const track = e.currentTarget || e.target;
              const on = track.classList.toggle('is-on');
              track.setAttribute('aria-checked', on);
              const thumb = track.querySelector('.toggle-thumb');
              if (thumb) thumb.style.transform = on ? 'translateX(30px)' : 'translateX(0)';
            })(event);
          }"
        >
          <div
            class="toggle-thumb"
            style="transition: transform 0.22s cubic-bezier(.2,.9,.2,1);"
          ></div>
        </div>
      </div>
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
      // start empty; we'll load bubbles from the API
      bubbles: [],
      loading: { bubbles: false },
      // reactive container dimensions
      containerWidth: 0,
      containerHeight: 0,
    };
  },
  methods: {
    // Update container size when mounted or resized
    updateContainerSize() {
  const el = this.$refs.bubbleContainer;
  if (el) {
    const topBar = document.querySelector('.topbar');
    const bottomBar = document.querySelector('.bottombar');
    const topH = topBar ? Math.round(topBar.getBoundingClientRect().height) : 72;
    const bottomH = bottomBar ? Math.round(bottomBar.getBoundingClientRect().height) : 72;

    const availableHeight = window.innerHeight - topH - bottomH;
    el.style.height = `${availableHeight}px`;
    el.style.minHeight = '0'; // Prevent any minimum height from adding space
    this.containerWidth = el.clientWidth || 0;
    this.containerHeight = el.clientHeight || 0;
      }
    },

    bubbleStyle(bubble) {
      const w = this.containerWidth;
      const h = this.containerHeight;
      const size = bubble.size || 0;

      const style = {
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${bubble.delay}s`,
        lineHeight: `${size}px`,
      };

      if (w > 0 && h > 0) {
        // clamp bubble size so it never exceeds container proportions
        const maxAllowed = Math.min(w * 0.6, h * 0.6);
        const sizeClamp = Math.min(size, Math.max(24, maxAllowed));

        // desired position based on percentage values stored in bubble.x/y
        let leftPx = (bubble.x / 100) * w;
        let topPx = (bubble.y / 100) * h;

        // account for float animation vertical movement so bubbles don't get pushed past the edge
        const safetyMargin = 22; // px (accounts for animation and shadows)

        // ensure bubble stays fully inside container (include safety margin)
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
        // fallback: percent positioning (should rarely happen)
        style.left = `${bubble.x}%`;
        style.top = `${bubble.y}%`;
        style.transform = 'translate(-50%, -50%)';
      }

      return style;
    }
    ,

    },

    selectBubble(bubble) {
      // Handle bubble selection, e.g., show details
      console.log('Selected bubble:', bubble);
    },

    // Load bubbles from localStorage, fallback to fetch
    loadBubbles() {
      const stored = localStorage.getItem('bubbles');
      if (stored) {
        try {
          this.bubbles = JSON.parse(stored);
          this.$nextTick(() => this.updateContainerSize());
        } catch (e) {
          console.error('Failed to parse stored bubbles:', e);
          this.fetchBubbles();
        }
      } else {
        this.fetchBubbles();
      }
    },

// Fetch bubbles from server and map event_type to visual layout
async fetchBubbles() {
  this.loading.bubbles = true;
  try {
    const querySnapshot = await getDocs(collection(db, 'bubbles'));
    const docs = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      docs.push({
        id: doc.id,
        event_type: d.event_type || d.type || null,
        bubble_created: d.bubble_created || d.timestamp || null,
        event_title: d.event_title || d.eventName || d.title || d.name || null,
        event_when: d.event_when || d.when || d.date || d.bubble_created || null,
        x: typeof d.x === 'number' ? d.x : 0,
        y: typeof d.y === 'number' ? d.y : 0,
        size: d.size || 50,
        color: d.color || '#8de3ea',
        raw: d
      });
    });

    // Simple, safe mapping to UI bubbles (avoids relying on undefined helpers)
    this.bubbles = docs.map((doc, idx) => {
      const type = (doc.event_type || doc.raw?.event_type || 'misc').toString().toLowerCase();
      let color = '#4794cf'; // default blue for leisure/hobby
      if (type.includes('food')) color = '#39a551'; // green for food
      else if (type.includes('sport')) color = '#d75966'; // red for activity/sport

      const title = doc.event_title || doc.raw?.title || doc.raw?.name || `Bubble ${idx + 1}`;
      return {
        id: doc.id,
        text: title,
        color: color,
        x: typeof doc.x === 'number' ? doc.x : Math.round(10 + Math.random() * 80),
        y: typeof doc.y === 'number' ? doc.y : Math.round(10 + Math.random() * 70),
        size: doc.size || 70,
        delay: (idx * 0.6) % 6,
        raw: doc
      };
    });

    // Store bubbles in localStorage
    localStorage.setItem('bubbles', JSON.stringify(this.bubbles));

    this.$nextTick(() => this.updateContainerSize());
  } catch (err) {
    console.error('Failed to load bubbles:', err);
    // fallback small bubble so UI doesn't break
    if (!this.bubbles || this.bubbles.length === 0) {
      this.bubbles = [{ text: 'Offline', color: '#4794cf', x: 50, y: 60, size: 100, delay: 0 }];
    }
  } finally {
    this.loading.bubbles = false;
  }
},


  mounted() {
    // measure container after mount and on resize
    this.$nextTick(() => {
      this.updateContainerSize();
      // load bubbles once layout is measured
      this.loadBubbles();
    });
    this._resizeHandler = () => this.updateContainerSize();
    window.addEventListener('resize', this._resizeHandler);
  },

  beforeUnmount() {
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
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

/* Ensure bubble-container fills the hero */
.bubble-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%; /* Override any JS-set height if needed */
  overflow: visible;
  margin: 0;
}

/* Remove any default container stretching */
.container.stretch {
  height: 100%;
  padding-top: 72px; /* Match topbar height to avoid overlap */
  padding-bottom: 72px; /* Match bottombar height to avoid overlap */
  margin: 0;
}

/* Ensure hero-body doesn't add extra space */
.hero-body {
  display: flex;
  align-items: stretch;
  justify-content: center;
  height: 100%;
  padding: 0;
  margin: 0;
}

/* remove the fixed container.stretch height to avoid double-calculation
   the bubble-container will be sized by JS to the exact space between bars */
.container.stretch { height: auto; }

/* Keep bubble-container height set by JS */
.bubble-container {
  position: relative;
  width: 100%;
  overflow: visible; /* allow shadows to show and prevent clipping */
  margin: 0 auto;
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


/* Keyframe animation for floating */
@keyframes float {
  0% { transform: translate(0,  0px); }
  50% { transform: translate(0, 15px); } /* Adjust vertical float distance */
  100% { transform: translate(0,  0px); }
}

/* Optional: Add a slight horizontal movement for more randomness */
.bubble:nth-child(even) {
    animation: float-h 12s ease-in-out infinite;
}
@keyframes float-h {
  0% { transform: translate(0px,  0); }
  50% { transform: translate(15px, 0); }
  100% { transform: translate(0px,  0); }
}
</style>