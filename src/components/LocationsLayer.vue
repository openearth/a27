<template>
  <!-- logic-only; no UI rendering -->
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useLocationsStore } from '@/stores/locations'

  const props = defineProps({
    map: Object,
  })

  const locationsStore = useLocationsStore()
  const sourceId = 'locations-source'
  const layerId = 'locations-layer'

  const geojson = computed(() => ({
    type: 'FeatureCollection',
    features: locationsStore.locations,
  }))

  watch([() => props.map, () => locationsStore.locations], ([map, locations]) => {
    if (!map?.value || locations.length === 0) return

    const m = map.value
    if (m.getSource(sourceId)) {
      m.getSource(sourceId).setData(geojson.value)
      console.log('🔄 Locations layer updated')
    } else {
      m.addSource(sourceId, { type: 'geojson', data: geojson.value })
      m.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-color': '#fff',
          'circle-radius': 5,
          'circle-stroke-width': 5,
          'circle-stroke-color': '#008fc5',
        },
      })
      console.log('🗺️ Locations layer added')
    }
  })
</script>
