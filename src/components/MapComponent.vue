<script setup>
  import { MapboxMap } from '@studiometa/vue-mapbox-gl'
  import { ref } from 'vue'
  import LocationsLayer from '@/components/LocationsLayer.vue'
  import { useAppStore } from '@/stores/app'
  import { useLocationsStore } from '@/stores/locations'

  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  const appStore = useAppStore()
  const locationsStore = useLocationsStore()
  const mapInstance = ref(null)

  function handleMapClick () {
    appStore.expandPanel()
  }

  function onMapCreated (map) {
    console.log('📍 Map instance created', map)
    mapInstance.value = map
    // Fetch locations after creation
    locationsStore.fetchLocations().then(() => {
      console.log('✅ Fetched locations', locationsStore.locations.length)
    })
  }
</script>

<template>
  <div class="map-wrapper">
    <mapbox-map
      v-model:map="mapInstance"
      :access-token="accessToken"
      :center="[4.7, 52.2]"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="7"
      @mb-click="handleMapClick"
      @mb-created="onMapCreated"
    >
      <LocationsLayer :map="mapInstance" />
    </mapbox-map>
  </div>
</template>
