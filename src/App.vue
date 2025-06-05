<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>a27</v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" app permanent />

    <v-main>
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
