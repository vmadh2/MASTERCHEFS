<template>
  <div id="app">
    <!-- router-view renders the component for the current route -->
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
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
