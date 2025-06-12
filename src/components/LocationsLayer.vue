<template>

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

  watch(
    () => locationsStore.locations,
    locations => {
      const map = props.map
      const sourceId = 'locations-source'
      const layerId = 'locations-layer'

      if (!map || !map.isStyleLoaded() || locations.length === 0) return

      const geojson = {
        type: 'FeatureCollection',
        features: locations,
      }

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson)
        console.log('🔄 Locations layer updated')
      } else {
        if (map.getLayer(layerId)) return
        map.addSource(sourceId, { type: 'geojson', data: geojson })
        map.addLayer({
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
    },
    { immediate: true },
  )
</script>
