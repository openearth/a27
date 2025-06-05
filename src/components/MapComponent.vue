<template>
  <div class="map-wrapper">
    <mapbox-map
      access-token=""
      :center="[4.7, 52.2]"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="7"
    />
  </div>
</template>

<script setup>
  import { MapboxMap } from '@studiometa/vue-mapbox-gl'
</script>
<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
}
</style>
