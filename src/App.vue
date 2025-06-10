<template>
  <v-app>
    <v-app-bar app color="primary">
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
        <div class="details d-flex flex-row">
          <div class="details__column">
            <h3 class="text-h6">
              Details meetlocatie XXX
            </h3>
            <div>
              <v-table>
                <tbody>
                  <tr>
                    <td>Naam</td>
                    <td>XXX</td>
                  </tr>
                  <tr>
                    <td>Coördinaten (EPSG:28992)</td>
                    <td>XXX</td>
                  </tr>
                  <tr>
                    <td colspan="2">XXX</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </div>
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
  z-index: 2;
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

.details {
  gap: 24px;
  height: 100%;
  padding: 24px 0;
  overflow: hidden;
}

.details__column {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 24px;
  overflow: auto;
}

.details__column .text-h6 {
  margin-bottom: 16px;
}

</style>
