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
    </div>
  </header>

  <section class="hero is-light">
    <div class="hero-body is-align-items-center">
      <div class="container has-text-centered stretch" style="width:100%;">


  <div class="bubble-container" ref="bubbleContainer">
          <div
            v-for="(bubble, index) in bubbles"
            :key="index"
            class="bubble"
            :class="bubble.colorClass"
            :style="bubbleStyle(bubble)"
          >
            <p>{{ bubble.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Bottom bar (fixed) like the screenshot) -->
  <footer class="bottombar">
    <div class="bottombar-inner">
      <div class="bottombar-left">Public</div>
      <div class="bottombar-toggle" role="switch" aria-checked="false">
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
      </div>
      <div class="bottombar-right">Private</div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'HomeBoard',
  data() {
    return {
      bubbles: [
        { text: 'Innovation', colorClass: 'is-pastel-red', x: 10, y: 20, size: 100, delay: 0 },
        { text: 'Creativity', colorClass: 'is-pastel-green', x: 70, y: 10, size: 120, delay: 2 },
        { text: 'Community', colorClass: 'is-pastel-blue', x: 30, y: 50, size: 105, delay: 1 },
        { text: 'Growth', colorClass: 'is-pastel-green', x: 55, y: 30, size: 110, delay: 3 },
        { text: 'Harmony', colorClass: 'is-pastel-red', x: 15, y: 70, size: 130, delay: 4 },
        { text: 'Discovery', colorClass: 'is-pastel-blue', x: 80, y: 60, size: 100, delay: 2.5 },
        { text: 'Table Tennis', colorClass: 'is-pastel-green', x: 70, y: 80, size: 115, delay: 1.5 },
        { text: 'PRACTICE', colorClass: 'is-pastel-green', x: 40, y: 80, size: 90, delay: 1.5 },
      ],
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
        // measure fixed bars (use actual DOM heights if available)
        const topBar = document.querySelector('.topbar');
        const bottomBar = document.querySelector('.bottombar');
        const topH = topBar ? Math.round(topBar.getBoundingClientRect().height) : 72;
        const bottomH = bottomBar ? Math.round(bottomBar.getBoundingClientRect().height) : 72;

        // available space strictly between the bars
        const availableHeight = Math.max(120, window.innerHeight - topH - bottomH);

        // explicitly set the bubble container height so positioning math matches visible space
        el.style.height = `${availableHeight}px`;

        // then read the actual client sizes (after setting height)
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
  },

  mounted() {
    // measure container after mount and on resize
    this.$nextTick(() => this.updateContainerSize());
    this._resizeHandler = () => this.updateContainerSize();
    window.addEventListener('resize', this._resizeHandler);
  },

  beforeUnmount() {
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
  },
};
</script>

<style scoped>
.bubble-container {
  position: relative;
  width: 100%;
  overflow: visible; /* allow shadows to show and prevent clipping */
  margin: 0 auto;
}

.bubble {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white; /* Or a darker shade for contrast */
  font-weight: bold;
  font-size: 1.2em;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  animation: float 10s ease-in-out infinite; /* Main floating animation */
  will-change: transform;
}

/* Ensure the hero-body centers its content vertically */
.hero-body {
  display: flex;
  align-items: stretch;
  justify-content: center;
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