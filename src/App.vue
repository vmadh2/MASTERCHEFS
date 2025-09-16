<template>
  <div id="app">
    <HomePage />
  </div>
</template>

<script>
import HomePage from './components/HomePage.vue';

export default {
  name: 'App',
  components: {
    HomePage,
  },
};
</script>

<style>
/* You might want some global styling here if needed */
body, html {
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevent scroll if bubbles go outside */
}
</style>
