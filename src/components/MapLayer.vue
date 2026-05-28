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
  import { MapboxLayer } from '@studiometa/vue-mapbox-gl'

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
    emits: ['click', 'mouseenter', 'mouseleave'],
    methods: {
      onLayerClicked (e) {
        // Emit feature and full event, MapComponent will filter by layerId
        this.$emit('click', e.features?.[0], e)
      },
      onMouseenter (e) {
        // Emit full event so MapComponent can access features
        this.$emit('mouseenter', e)
      },
      onMouseleave () {
        this.$emit('mouseleave')
      },
    },
  }
</script>

