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
  const exists = mapObj && mapObj.getLayer(props.id)
  console.log(`[LayerPaintControl] isLayerReady check for ${props.id}:`, exists)
  if (mapObj) {
    console.log(`[LayerPaintControl] Map style loaded:`, mapObj.isStyleLoaded())
    console.log(`[LayerPaintControl] All layers on map:`, mapObj.getStyle()?.layers?.map(l => l.id) || [])
  }
  return exists
}

// Watch for paint changes and apply them to the layer
watch(
  () => props.paint,
  (newPaint) => {
    console.log(`[LayerPaintControl] Paint prop changed for layer: ${props.id}`)
    const mapObj = unref(map)
    const layerExists = isLayerReady()
    
    if (!layerExists) {
      console.log(`[LayerPaintControl] Layer ${props.id} not ready, will retry in 100ms`)
      // Retry after a short delay if layer doesn't exist yet
      setTimeout(() => {
        const retryMapObj = unref(map)
        const retryLayerExists = retryMapObj && retryMapObj.getLayer(props.id)
        console.log(`[LayerPaintControl] Retry check for ${props.id}:`, retryLayerExists)
        if (retryLayerExists) {
          console.log(`[LayerPaintControl] Applying paint properties on retry for ${props.id}`)
          applyPaintProperties(retryMapObj, newPaint)
        } else {
          console.log(`[LayerPaintControl] Layer ${props.id} still not available after retry`)
        }
      }, 100)
      return
    }

    console.log(`[LayerPaintControl] Layer ${props.id} exists, applying paint properties`)
    applyPaintProperties(mapObj, newPaint)
  },
  { deep: true, immediate: true }
)

// Separate function to apply paint properties
function applyPaintProperties(mapObj, paint) {
  console.log(`[LayerPaintControl] applyPaintProperties called for ${props.id}`)
  console.log(`[LayerPaintControl] Map object available:`, !!mapObj)
  console.log(`[LayerPaintControl] Layer exists:`, !!mapObj?.getLayer(props.id))
  console.log(`[LayerPaintControl] Paint properties to apply:`, Object.keys(paint))
  
  if (!mapObj || !mapObj.getLayer(props.id)) {
    console.log(`[LayerPaintControl] Cannot apply paint - map or layer not available`)
    return
  }

  // Apply each paint property to the layer
  Object.keys(paint).forEach((property) => {
    try {
      console.log(`[LayerPaintControl] Setting paint property "${property}" for ${props.id}`)
      mapObj.setPaintProperty(props.id, property, paint[property])
      console.log(`[LayerPaintControl] Successfully set "${property}" for ${props.id}`)
    } catch (error) {
      console.error(`[LayerPaintControl] Failed to set paint property ${property} for layer ${props.id}:`, error)
    }
  })
  console.log(`[LayerPaintControl] Finished applying all paint properties for ${props.id}`)
}
</script>

