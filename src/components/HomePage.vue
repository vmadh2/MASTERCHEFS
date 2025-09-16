<template>
  <section class="hero is-fullheight is-light">
    <div class="hero-body">
      <div class="container has-text-centered">
        <h1 class="title is-1">Welcome Home!</h1>
        <h2 class="subtitle is-3">Explore our floating ideas.</h2>

        <div class="bubble-container">
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
  name: 'HomePage',
  data() {
    return {
      bubbles: [
        { text: 'Innovation', colorClass: 'is-pastel-red', x: 10, y: 20, size: 100, delay: 0 },
        { text: 'Creativity', colorClass: 'is-pastel-green', x: 70, y: 10, size: 120, delay: 2 },
        { text: 'Community', colorClass: 'is-pastel-blue', x: 30, y: 50, size: 90, delay: 1 },
        { text: 'Growth', colorClass: 'is-pastel-green', x: 55, y: 30, size: 110, delay: 3 },
        { text: 'Harmony', colorClass: 'is-pastel-red', x: 15, y: 70, size: 130, delay: 4 },
        { text: 'Discovery', colorClass: 'is-pastel-blue', x: 80, y: 60, size: 100, delay: 2.5 },
        // Add more bubbles as needed
      ]
    };
  },
  methods: {
    bubbleStyle(bubble) {
      return {
        top: `${bubble.y}vh`,
        left: `${bubble.x}vw`,
        width: `${bubble.size}px`,
        height: `${bubble.size}px`,
        animationDelay: `${bubble.delay}s`,
        lineHeight: `${bubble.size}px`, // Center text vertically
      };
    }
  }
};
</script>

<style scoped>
.bubble-container {
  position: relative;
  width: 100%;
  height: 60vh; /* Adjust as needed */
  overflow: hidden;
  margin-top: 50px;
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

/* Pastel Colors */
.is-pastel-red {
  background-color: #ffb3ba; /* Light Coral */
}
.is-pastel-green {
  background-color: #bae1ff; /* Light Cyan */
}
.is-pastel-blue {
  background-color: #baffc9; /* Light Green */
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