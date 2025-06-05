<template>
  <div style="width: 100%; height: 100%;">
    <mapbox-map
      ref="mapboxmap"
      access-token=""
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
