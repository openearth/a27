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
            "#dc3545",
            "#6c757d",
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
      map.getCanvas().style.cursor = "pointer";

      const feature = e.features?.[0];
      if (feature) {
        const coords = feature.geometry.coordinates.slice();
        const locatieId = feature.properties?.locatie_id || "Unknown";
        const peilfilterIds = feature.properties?.peilfilter_ids || "";

        // Parse peilfilter IDs (comma-separated string)
        const peilfilterList = peilfilterIds
          ? peilfilterIds.split(",").map((id) => id.trim())
          : [];

        // Build HTML content
        const bronId = feature.properties?.bron_id || "Unknown";
        const dataleverancier =
          feature.properties?.dataleverancier || "Unknown";

        let htmlContent = `<div>Locatie ID: <strong>${locatieId}</strong></div>`;
        htmlContent += `<div>Bron ID: <strong>${bronId}</strong></div>`;
        htmlContent += `<div>Dataleverancier: <strong>${dataleverancier}</strong></div>`;

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
