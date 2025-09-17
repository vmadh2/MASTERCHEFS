<template>
  <section class="hero is-fullheight is-light">
    <div class="hero-body is-align-items-center" style="display:flex; align-items:center;">
      <div class="container has-text-centered" style="width:100%;">
        <h1 class="title is-1">Welcome Home!</h1>
        <h2 class="subtitle is-3">Explore our floating ideas.</h2>

        <!-- Bulma button linking to Private Board -->
        <div style="margin: 1.5rem 0;">
          <router-link to="/private-board" class="button is-primary is-medium">
            Go to Private Board
          </router-link>
        </div>

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
</template>

<script>
export default {
  name: 'HomeBoard',
  data() {
    return {
      bubbles: [
        { text: 'Innovation', colorClass: 'is-pastel-red', x: 10, y: 20, size: 100, delay: 0 },
        { text: 'Creativity', colorClass: 'is-pastel-green', x: 70, y: 10, size: 120, delay: 2 },
        { text: 'Community', colorClass: 'is-pastel-blue', x: 30, y: 50, size: 90, delay: 1 },
        { text: 'Growth', colorClass: 'is-pastel-green', x: 55, y: 30, size: 110, delay: 3 },
        { text: 'Harmony', colorClass: 'is-pastel-red', x: 15, y: 70, size: 130, delay: 4 },
        { text: 'Discovery', colorClass: 'is-pastel-blue', x: 80, y: 60, size: 100, delay: 2.5 },
        { text: 'Table Tennis', colorClass: 'is-pastel-green', x: 40, y: 80, size: 115, delay: 1.5 },
        { text: 'ROOFIE PRACTICE', colorClass: 'is-pastel-green', x: 40, y: 80, size: 300, delay: 1.5 },
        // Add more bubbles as needed
      ],
      // reactive container dimensions
      containerWidth: 0,
      containerHeight: 0,
  containerLeft: 0,
  containerTop: 0,
    };
  },
  methods: {
    // Update container size when mounted or resized
    updateContainerSize() {
        const el = this.$refs.bubbleContainer;
        if (el) {
          const rect = el.getBoundingClientRect();
          this.containerWidth = rect.width || 0;
          this.containerHeight = rect.height || 0;
          this.containerLeft = rect.left || 0;
          this.containerTop = rect.top || 0;
        }
    },

    bubbleStyle(bubble) {
      // If we have container dimensions, compute pixel positions and clamp
      // so the bubble remains fully visible inside the container.
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
        // desired position based on percentage values stored in bubble.x/y
        let leftPx = (bubble.x / 100) * w + this.containerLeft;
        let topPx = (bubble.y / 100) * h + this.containerTop;

        // ensure bubble stays fully inside viewport
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        const maxLeftInViewport = Math.max(0, viewportW - size);
        const maxTopInViewport = Math.max(0, viewportH - size);

        leftPx = Math.max(this.containerLeft, Math.min(leftPx, this.containerLeft + Math.min(w - size, maxLeftInViewport - this.containerLeft)));
        topPx = Math.max(this.containerTop, Math.min(topPx, this.containerTop + Math.min(h - size, maxTopInViewport - this.containerTop)));

        // Convert back to positions relative to container for absolute positioning
        style.left = `${leftPx - this.containerLeft}px`;
        style.top = `${topPx - this.containerTop}px`;
        style.transform = 'none';
      } else {
        // fallback: use percent positioning and center the bubble at that point
        style.left = `${bubble.x}%`;
        style.top = `${bubble.y}%`;
        style.transform = 'translate(-50%, -50%)';
      }

      return style;
    }
  },

  mounted() {
    // measure container after mount and on resize
    this.updateContainerSize();
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
  height: 45vh; /* Reduced so content fits within viewport */
  max-height: 55vh;
  overflow: hidden;
  margin: 1.5rem auto;
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
  align-items: center;
  justify-content: center;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Pastel Colors */
.is-pastel-red {
  background-color: #f70f26  /* Light Coral */
}
.is-pastel-green {
  background-color: #0369b7; /* Light Cyan */
}
.is-pastel-blue {
  background-color: #026818; /* Light Green */
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