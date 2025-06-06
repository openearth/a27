<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title>a27</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <map-component />
      <div class="app-panel" :class="{ collapsed: panelIsCollapsed }">
        <v-btn
          class="app-panel__minimize"
          flat
          icon
          title="Minimaliseer"
          @click="onClick"
        >
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </div>
    </v-main>
  </v-app>
</template>
<script setup>

  import { computed } from 'vue'
  import { useAppStore } from '@/stores/app'

  const appStore = useAppStore()
  const panelIsCollapsed = computed(() => appStore.panelIsCollapsed)

  function onClick () {
    appStore.collapsePanel()
  }

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

.app-panel__minimize {
  position: absolute;
  top: 0;
  right: 0;
  margin: 8px;
}

</style>
