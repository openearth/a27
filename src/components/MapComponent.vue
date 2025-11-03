<script setup>
  import { MapboxMap } from '@studiometa/vue-mapbox-gl'
  import { computed, ref, watch } from 'vue'
  import MapLayer from '@/components/MapLayer.vue'
  import { useLocationsStore } from '@/stores/locations'
  import { useMapStore } from '@/stores/map'

  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  const locationsStore = useLocationsStore()
  const mapStore = useMapStore()
  const mapInstance = ref(null)
  const mapboxLayers = computed(() => mapStore.mapboxLayers)

  function onMapCreated (map) {
    mapInstance.value = map
    mapStore.initializeMapboxLayers()
    locationsStore.fetchLocations().then(() => {
      // Refresh layers after locations are fetched
      mapStore.refreshLayers()
    })
  }

  // Watch for locations changes and refresh layers
  watch(
    () => locationsStore.locations,
    () => {
      mapStore.refreshLayers()
    }
  )
</script>

<template>
  <div class="map-wrapper">
    <mapbox-map
      v-model:map="mapInstance"
      :access-token="accessToken"
      :center="[5.1, 52.07]"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="10.5"
      @mb-created="onMapCreated"
    >
      <MapLayer
        v-for="layer in mapboxLayers"
        :key="layer.id"
        :layer="layer"
      />
    </mapbox-map>
  </div>
</template>

<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
}
</style>
