<template>
  <v-app>
    <v-main style="height: 100vh;">
      <v-app-bar app>
        <v-toolbar-title>a27</v-toolbar-title>
      </v-app-bar>

      <v-navigation-drawer v-model="drawer" app permanent>
      <!-- Navigation items -->
      </v-navigation-drawer>

      <map-component />
    </v-main>
  </v-app>
</template>

<script>
  export default {
    data () {
      return {
        drawer: true,
      }
    },
  }
</script>
