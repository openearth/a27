<template>
  <v-app>
    <v-app-bar app color="primary">
      <v-toolbar-title>a27</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <map-component />
      <div class="view-mode-toggle">
        <v-btn-toggle
          v-model="viewMode"
          mandatory
          color="primary"
          density="compact"
        >
          <v-btn value="focus">
            Focus area
          </v-btn>
          <v-btn value="all">
            All locations
          </v-btn>
        </v-btn-toggle>
      </div>
      <div class="map-legend">
        <div class="legend-title">
          Dataleveranciers
        </div>
        <div class="legend-items">
          <div
            v-for="item in legendItems"
            :key="item.bronId"
            class="legend-item"
            :class="{
              'legend-item--disabled': appStore.disabledCategories.has(
                item.bronId
              ),
            }"
            @click="appStore.toggleCategory(item.bronId)"
          >
            <div
              class="legend-symbol"
              :style="{
                borderColor: appStore.disabledCategories.has(item.bronId)
                  ? '#ccc'
                  : item.color,
                opacity: appStore.disabledCategories.has(item.bronId) ? 0.5 : 1,
              }"
            />
            <span class="legend-text">{{ item.dataleverancier }}</span>
          </div>
        </div>
      </div>
      <div class="app-panel" :class="{ collapsed: panelIsCollapsed }">
        <v-btn
          class="app-panel__minimize"
          flat
          icon
          title="Minimaliseer"
          @click="onClick"
        >
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
        <div class="details d-flex flex-row">
          <div class="details__column details__table">
            <h3 class="text-h6">
              Details meetlocatie
              {{
                locationsStore.activeLocation?.properties?.locatienaam_master || "..."
              }}{{ locationsStore.activeLocation?.properties?.locatie_id ? ` (${locationsStore.activeLocation.properties.locatie_id})` : "" }}
            </h3>
            <v-table>
              <tbody>
                <tr v-if="hasValidDLabel">
                  <td>DLabel</td>
                  <td>
                    {{ peilfilterDataStore.dlabelFilter }}
                  </td>
                </tr>
                <tr v-if="hasValidPompId">
                  <td>Pomp Test code</td>
                  <td>
                    {{ peilfilterDataStore.pompidFilter }}
                  </td>
                </tr>
                <tr>
                  <td>Peilfilternaam</td>
                  <td>
                    <v-select
                      v-model="selectedPeilfilterId"
                      dense
                      hide-details
                      :items="peilfilterOptions"
                      item-title="title"
                      item-value="value"
                      outlined
                      style="max-width: 300px"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Dataleverancier</td>
                  <td>
                    {{
                      locationsStore.activeLocation?.properties
                        ?.dataleverancier || "..."
                    }}
                  </td>
                </tr>
                <tr>
                  <td>Coördinaten (EPSG:4326)</td>
                  <td>
                    {{
                      locationsStore.activeLocation?.geometry?.coordinates?.[0].toFixed(
                        6
                      )
                    }},
                    {{
                      locationsStore.activeLocation?.geometry?.coordinates?.[1].toFixed(
                        6
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="details__column peilfilter__chart">
            <PeilfilterGraph />
          </div>

          <div class="details__column details__chart">
            <TimeSeriesChart />
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>
<script setup>
  import { computed, ref, watch } from "vue";
  import PeilfilterGraph from "@/components/PeilfilterGraph.vue";
  import TimeSeriesChart from "@/components/TimeSeriesChart.vue";
  import { useAppStore } from "@/stores/app";
  import { useDepthInfoStore } from "@/stores/depthInfo";
  import { useLocationsStore } from "@/stores/locations";
  import { useChartTimeseriesStore } from "@/stores/chartTimeseries";
  import { usePeilfilterDataStore } from "@/stores/peilfilterData";

  const appStore = useAppStore();
  const chartTimeseriesStore = useChartTimeseriesStore();
  const depthInfoStore = useDepthInfoStore();
  const locationsStore = useLocationsStore();
  const peilfilterDataStore = usePeilfilterDataStore();

  const panelIsCollapsed = computed(() => appStore.panelIsCollapsed);

  const viewMode = computed({
    get: () => appStore.viewMode,
    set: (value) => appStore.setViewMode(value),
  });

  function onClick() {
    appStore.collapsePanel();
  }

  const selectedPeilfilterId = ref(null);

  const legendItems = computed(() => {
    const uniqueProviders = new Map();

    // locationsStore.locations is now an array, not a FeatureCollection
    const locations = locationsStore.locations || [];
    
    locations.forEach((location) => {
      const bronId = location.properties?.bron_id;
      const dataleverancier = location.properties?.dataleverancier;

      if (bronId && dataleverancier && !uniqueProviders.has(bronId)) {
        uniqueProviders.set(bronId, {
          bronId,
          dataleverancier,
          color: getColorForBronId(bronId),
        });
      }
    });

    return Array.from(uniqueProviders.values()).sort(
      (a, b) => a.bronId - b.bronId
    );
  });

  function getColorForBronId(bronId) {
    const colors = {
      1: "#008fc5",
      2: "#28a745",
      3: "#ffc107",
      4: "#895129",
    };
    return colors[bronId] || "#6c757d"; // Gray fallback
  }

  const peilfilterOptions = computed(() => {
    const activeLocation = locationsStore.activeLocation;
    if (!activeLocation?.properties) return [];
    
    const ids = activeLocation.properties.peilfilter_ids;
    const naams = activeLocation.properties.peilfilternaams;
    
    if (!ids) return [];
    
    const idArray = ids.split(",").map((id) => id.trim());
    const naamArray = naams ? naams.split(",").map((naam) => naam.trim()) : [];
    
    return idArray
      .map((id, index) => {
        const naam = naamArray[index] || "";
        const title = naam ? `${naam} (${id})` : id;
        return {
          value: id,
          title,
        };
      })
      .sort((a, b) => Number(a.value) - Number(b.value));
  });

  const hasValidDLabel = computed(() => {
    const dlabel = peilfilterDataStore.dlabelFilter;
    return dlabel !== null && dlabel !== undefined && dlabel !== '';
  });

  const hasValidPompId = computed(() => {
    const pompid = peilfilterDataStore.pompidFilter;
    return pompid !== null && pompid !== undefined && pompid !== '';
  });

  function clearPanelDataStores() {
    chartTimeseriesStore.clearData();
    peilfilterDataStore.clearData();
    depthInfoStore.clearData();
  }

  function commaSplit(str) {
    return str.split(",").map((s) => s.trim());
  }

  function syncPeilfilterDetailsFromLocation(location, peilfilterId) {
    if (!location) {
      peilfilterDataStore.clearData();
      return;
    }
    const idStr =
      peilfilterId != null && peilfilterId !== ""
        ? String(peilfilterId)
        : null;
    if (!idStr) {
      peilfilterDataStore.clearData();
      return;
    }

    const idsStr = location.properties?.peilfilter_ids;
    let dlabel = null;
    let pompid = null;
    if (idsStr) {
      const idx = commaSplit(idsStr).indexOf(idStr);
      if (idx >= 0) {
        const at = (key) => {
          const raw = location.properties?.[key];
          if (!raw) return null;
          const parts = commaSplit(raw);
          return parts[idx] || null;
        };
        dlabel = at("dlabel_filters");
        pompid = at("pompids") ?? at("pompids_filters");
      }
    }
    peilfilterDataStore.setPeilfilterDetails({
      peilfilterId: idStr,
      dlabelFilter: dlabel,
      pompidFilter: pompid,
    });
  }

  watch(
    () => locationsStore.activeLocation,
    (newLocation) => {
      if (!newLocation) {
        selectedPeilfilterId.value = null;
        clearPanelDataStores();
        return;
      }
      clearPanelDataStores();
      const options = peilfilterOptions.value;
      selectedPeilfilterId.value =
        options.length > 0 ? options[0].value : null;
      const idsStr = newLocation.properties?.peilfilter_ids;
      const peilfilterIds = idsStr
        ? commaSplit(idsStr)
          .map((id) => Number(id))
          .filter((n) => !Number.isNaN(n))
        : [];
      if (peilfilterIds.length > 0) {
        depthInfoStore.fetchDepthInfo(peilfilterIds);
      }
    },
    { immediate: true }
  );

  /** Refetch when the map point or peilfilter dropdown changes (same id on two points still updates x/y). */
  watch(
    [() => locationsStore.activeLocation, () => selectedPeilfilterId.value],
    ([loc, newId]) => {
      if (!loc) return;
      syncPeilfilterDetailsFromLocation(loc, newId);
      const x = loc.geometry?.coordinates?.[0];
      const y = loc.geometry?.coordinates?.[1];
      if (x == null || y == null) {
        chartTimeseriesStore.clearData();
        return;
      }
      const pointId =
        newId != null && newId !== "" ? newId : loc.properties?.locatie_id;
      if (pointId == null || pointId === "") {
        chartTimeseriesStore.clearData();
        return;
      }
      chartTimeseriesStore.fetchTimeseriesData({ id: pointId, x, y });
    },
    { immediate: true }
  );
</script>

<style scoped>
.app-panel {
  position: fixed;
  z-index: 2;
  bottom: 0;
  width: 100%;
  height: 50vh;
  overflow: hidden;
  background-color: #fff;
  box-shadow: 0 -2px 8px 0px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.app-panel.collapsed {
  transform: translateY(100%);
}

.app-panel__minimize {
  position: absolute;
  top: 0;
  right: 0;
  margin: 8px;
  z-index: 1;
}

.details {
  display: flex;
  height: 100%;
  padding: 24px 0;
  overflow: hidden;
}

.details__column {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 24px;
  overflow: auto;
}

.details__column .text-h6 {
  margin-bottom: 16px;
}

.details__table {
  flex: 0 0 auto;
  width: 500px;
}

.peilfilter__chart {
  flex: 0 0 auto;
  width: 250px;
  overflow: hidden;
  position: relative;
  padding: 0 0;
}

.details__chart {
  flex: 1 1 0;
  overflow: hidden;
  position: relative;
}

.view-mode-toggle {
  position: fixed;
  top: 80px;
  left: 20px;
  z-index: 4;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 8px;
}

.map-legend {
  position: fixed;
  top: 140px;
  left: 20px;
  z-index: 3;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 200px;
}

.legend-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.legend-item:hover {
  background-color: #f5f5f5;
}

.legend-item--disabled {
  opacity: 0.5;
}

.legend-item--disabled:hover {
  background-color: #f0f0f0;
}

.legend-symbol {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  border: 4px solid;
  flex-shrink: 0;
}

.legend-text {
  font-size: 12px;
  color: #555;
  line-height: 1.2;
}
</style>
