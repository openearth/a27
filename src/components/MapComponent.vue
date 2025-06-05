<template>
  <div class="map">
    <mapbox-map
      access-token="pk.eyJ1IjoiY29hc3R2aWV3ZXIiLCJhIjoiY2szNW9ncXVsMGtzNzNocGVxZDA5cHlzNiJ9.m8m9xVdtdxvZXWn30rNBQw"
      :center="[4.7, 52.2]"
      class="map"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="7"
    />
  </div>
</template>

<script setup>
  import { MapboxMap } from '@studiometa/vue-mapbox-gl'
</script>
<style>
.mapboxgl-map, .map {
  width: 100%;
  height: 100%;
}
</style>
