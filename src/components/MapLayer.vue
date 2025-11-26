<template>
  <MapboxLayer
    v-if="layer"
    :id="layer.id"
    :options="layer"
    @mb-click="onLayerClicked"
    @mb-mouseenter="onMouseenter"
    @mb-mouseleave="onMouseleave"
  />
</template>
<script>
  import { MapboxLayer, useMap } from '@studiometa/vue-mapbox-gl'
  import { unref } from 'vue'

  export default {
    components: {
      MapboxLayer,
    },
    props: {
      layer: {
        type: Object,
        default: () => {},
      },
    },
    mounted () {
      const { map } = useMap()
      this.map = map
    },
    methods: {
      onLayerClicked (e) {
        // Emit feature and full event, MapComponent will filter by layerId
        this.$emit('click', e.features?.[0], e)
      },
      onMouseenter (e) {
        // Emit full event so MapComponent can access features
        this.$emit('mouseenter', e)
        // Also update cursor here as fallback
        if (unref(this.map)) {
          unref(this.map).getCanvas().style.cursor = 'pointer'
        }
      },
      onMouseleave () {
        this.$emit('mouseleave')
        // Reset cursor
        if (unref(this.map)) {
          unref(this.map).getCanvas().style.cursor = ''
        }
      },
    },
  }
</script>

