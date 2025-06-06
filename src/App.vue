<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>a27</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <map-component />
      <div class="app-panel" :class="{ collapsed: panelIsCollapsed }" />
    </v-main>
  </v-app>
</template>
<script setup>

  import { computed } from 'vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
  const panelIsCollapsed = computed(() => appStore.panelIsCollapsed)

</script>

<style scoped>

.app-panel {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 66vh;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 -2px 8px 0px rgba(0, 0, 0, .3);
  transition: transform 0.3s ease;
}

.app-panel.collapsed {
  transform: translateY(100%);
}

</style>
