<template>
  <div />
</template>

<script setup>
  import { watch, ref } from "vue";
  import mapboxgl from "mapbox-gl";
  import { useAppStore } from "@/stores/app";
  import { useLocationsStore } from "@/stores/locations";

  const props = defineProps({
    map: {
      type: Object,
      default: null,
    },
  });

  const locationsStore = useLocationsStore();
  const appStore = useAppStore();
  const hoverPopup = ref(null);

  watch(
    () => locationsStore.locations,
    (locations) => {
      const map = props.map;
      const sourceId = "locations-source";
      const layerId = "locations-layer";

      if (!map || !map.isStyleLoaded() || locations.length === 0) return;

      const geojson = {
        type: "FeatureCollection",
        features: locations,
      };

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojson);
      } else {
        if (map.getLayer(layerId)) return;
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-color": "#fff",
            "circle-radius": 5,
            "circle-stroke-width": 5,
            "circle-stroke-color": [
              "case",
              ["==", ["get", "bron_id"], 1],
              "#008fc5",
              ["==", ["get", "bron_id"], 2],
              "#28a745",
              ["==", ["get", "bron_id"], 3],
              "#ffc107",
              ["==", ["get", "bron_id"], 4],
              "#895129",
              "#6c757d",
            ],
            "circle-opacity": [
              "case",
              ["==", ["get", "bron_id"], 1],
              1,
              ["==", ["get", "bron_id"], 2],
              1,
              ["==", ["get", "bron_id"], 3],
              1,
              ["==", ["get", "bron_id"], 4],
              1,
              1,
            ],
          },
        });
        map.addSource("active-location", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "active-location-layer",
          type: "circle",
          source: "active-location",
          paint: {
            "circle-color": "#fff",
            "circle-radius": 5,
            "circle-stroke-width": 5.5,
            "circle-stroke-color": "#ff0000",
          },
        });
      }

      map.on("click", "locations-layer", (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const bronId = feature.properties?.bron_id;
          // Don't allow interaction if category is disabled
          if (appStore.disabledCategories.has(bronId)) {
            return;
          }

          locationsStore.setActiveLocation(feature);
          appStore.expandPanel();

          const coords = feature.geometry.coordinates;
          const canvas = map.getCanvas();
          const offsetY = canvas.height * 0.25;

          map.flyTo({
            center: coords,
            zoom: 12.5,
            speed: 1.2,
            offset: [0, -offsetY],
          });
        }
      });

      map.on("mouseenter", "locations-layer", (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const hoverBronId = feature.properties?.bron_id;
          // Don't show hover if category is disabled
          if (appStore.disabledCategories.has(hoverBronId)) {
            map.getCanvas().style.cursor = "grab";
            return;
          }

          map.getCanvas().style.cursor = "pointer";
          const coords = feature.geometry.coordinates.slice();
          const locatieId = feature.properties?.locatie_id || "Unknown";
          const peilfilterIds = feature.properties?.peilfilter_ids || "";

          // Parse peilfilter IDs (comma-separated string)
          const peilfilterList = peilfilterIds
            ? peilfilterIds.split(",").map((id) => id.trim())
            : [];

          // Build HTML content

          let htmlContent = `<div>Locatie ID: <strong>${locatieId}</strong></div>`;

          if (peilfilterList.length > 0) {
            const label =
              peilfilterList.length === 1 ? "Peilfilter" : "Peilfilters";
            const ids = peilfilterList
              .map((id) => `<strong>${id}</strong>`)
              .join(", ");
            htmlContent += `<div>${label}: ${ids}</div>`;
          }

          if (!hoverPopup.value) {
            hoverPopup.value = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: "location-hover-popup",
            });
          }

          hoverPopup.value.setLngLat(coords).setHTML(htmlContent).addTo(map);
        }
      });
      map.on("mouseleave", "locations-layer", () => {
        map.getCanvas().style.cursor = "";

        if (hoverPopup.value) {
          hoverPopup.value.remove();
        }
      });
    },
    { immediate: true }
  );

  // Watch for disabled categories changes and update map layer
  watch(
    () => appStore.disabledCategories,
    (disabledCategories) => {
      const map = props.map;
      if (!map || !map.getLayer("locations-layer")) return;

      // Update circle opacity based on disabled categories
      //Move all these to store.
      const opacityExpression = [
        "case",
        ["==", ["get", "bron_id"], 1],
        disabledCategories.has(1) ? 0.3 : 1,
        ["==", ["get", "bron_id"], 2],
        disabledCategories.has(2) ? 0.3 : 1,
        ["==", ["get", "bron_id"], 3],
        disabledCategories.has(3) ? 0.3 : 1,
        ["==", ["get", "bron_id"], 4],
        disabledCategories.has(4) ? 0.3 : 1,
        1,
      ];
      //move all this to store
      // Update stroke color to gray with transparency when disabled
      const strokeColorExpression = [
        "case",
        ["==", ["get", "bron_id"], 1],
        disabledCategories.has(1) ? "rgba(153, 153, 153, 0.3)" : "#008fc5",
        ["==", ["get", "bron_id"], 2],
        disabledCategories.has(2) ? "rgba(153, 153, 153, 0.3)" : "#28a745",
        ["==", ["get", "bron_id"], 3],
        disabledCategories.has(3) ? "rgba(153, 153, 153, 0.3)" : "#ffc107",
        ["==", ["get", "bron_id"], 4],
        disabledCategories.has(4) ? "rgba(153, 153, 153, 0.3)" : "#895129",
        "#6c757d",
      ];
      // You can create a component. Name it LayerPaintControl. Accepts as props the layer id. 
      // In the component you need to inject the map in order to have the mapbox-gl functionalities.
      
      map.setPaintProperty(
        "locations-layer",
        "circle-opacity",
        opacityExpression
      );

      map.setPaintProperty(
        "locations-layer",
        "circle-stroke-color",
        strokeColorExpression
      );
    },
    { deep: true }
  );

  watch(
    () => locationsStore.activeLocation,
    (activeLocation) => {
      const map = props.map;
      if (!map || !map.getSource("active-location")) return;

      if (activeLocation) {
        const plainFeature = JSON.parse(JSON.stringify(activeLocation));
        map.getSource("active-location").setData({
          type: "FeatureCollection",
          features: [plainFeature],
        });
      } else {
        map.getSource("active-location").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    },
    { immediate: true }
  );
</script>

<style>
.location-hover-popup .mapboxgl-popup-content {
  padding: 8px 12px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.location-hover-popup .mapboxgl-popup-content div {
  line-height: 1.5;
}

.location-hover-popup .mapboxgl-popup-tip {
  border-top-color: white;
}
</style>
