<script setup>
  import { MapboxMap, MapboxNavigationControl  } from '@studiometa/vue-mapbox-gl'
  import { ref, computed } from 'vue'
  import LocationsLayer from '@/components/LocationsLayer.vue'
  import BasemapControl from '@/components/BasemapControl.vue'
  import { useLocationsStore } from '@/stores/locations'
  import { MAP_BASELAYERS, MAP_BASELAYER_DEFAULT } from '@/lib/constants'

  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  const locationsStore = useLocationsStore()
  const mapInstance = ref(null)

  function onMapCreated (map) {
    mapInstance.value = map
    locationsStore.fetchLocations().then(() => {
    })
  }

  const defaultMapStyle = computed(() => MAP_BASELAYER_DEFAULT.uri)
</script>

<template>
  <div class="map-wrapper">
    <mapbox-map
      v-model:map="mapInstance"
      :access-token="accessToken"
      :center="[5.1, 52.07]"
      :map-style="defaultMapStyle"
      :zoom="10.5"
      @mb-created="onMapCreated"
    >
      <LocationsLayer :map="mapInstance" />
      
      <MapboxNavigationControl 
        :show-compass="false" 
        position="bottom-right" 
      />
      
      <div class="map-controls">
        <BasemapControl 
          v-if="mapInstance" 
          :map="mapInstance" 
          :styles="MAP_BASELAYERS"
        />
      </div>
    </mapbox-map>
  </div>
</template>

<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-controls {
  position: absolute;
  bottom: 90px;  
  right: 10px;  
  z-index: 1000;
}
</style>
