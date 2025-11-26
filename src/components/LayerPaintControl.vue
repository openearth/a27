<template>
  <div style="display: none;"></div>
</template>

<script setup>
import { watch, unref } from 'vue'
import { useMap } from '@studiometa/vue-mapbox-gl'

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  paint: {
    type: Object,
    required: true,
  },
})

// Get map instance from parent
const { map } = useMap()

// Helper function to check if layer is ready
function isLayerReady() {
  const mapObj = unref(map)
  return mapObj && mapObj.getLayer(props.id)
}

// Watch for paint changes and apply them to the layer
watch(
  () => props.paint,
  (newPaint) => {
    const mapObj = unref(map)
    const layerExists = isLayerReady()
    
    if (!layerExists) {
      // Retry after a short delay if layer doesn't exist yet
      setTimeout(() => {
        const retryMapObj = unref(map)
        const retryLayerExists = retryMapObj && retryMapObj.getLayer(props.id)
        if (retryLayerExists) {
          applyPaintProperties(retryMapObj, newPaint)
        }
      }, 100)
      return
    }

    applyPaintProperties(mapObj, newPaint)
  },
  { deep: true, immediate: true }
)

// Separate function to apply paint properties
function applyPaintProperties(mapObj, paint) {
  if (!mapObj || !mapObj.getLayer(props.id)) {
    return
  }

  // Apply each paint property to the layer
  Object.keys(paint).forEach((property) => {
    try {
      mapObj.setPaintProperty(props.id, property, paint[property])
    } catch (error) {
      console.error(`Failed to set paint property ${property} for layer ${props.id}:`, error)
    }
  })
}
</script>

