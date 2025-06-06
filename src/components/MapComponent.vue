<template>
  <div class="map-wrapper">
    <mapbox-map
      :access-token="accessToken"
      :center="[4.7, 52.2]"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="7"
      @click="handleMapClick"
    />
  </div>
</template>

<script setup>
  import { MapboxMap } from '@studiometa/vue-mapbox-gl'
  import { useAppStore } from '@/stores/app'

  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN

  const appStore = useAppStore()

  function handleMapClick () {
    appStore.expandPanel()
  }
</script>

<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
}
</style>
