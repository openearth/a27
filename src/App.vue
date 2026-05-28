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
            :key="item.key"
            class="legend-item"
            :class="{
              'legend-item--disabled': item.isTree
                ? appStore.disabledTrees
                : appStore.disabledCategories.has(item.bronId),
            }"
            @click="onLegendItemClick(item)"
          >
            <div
              v-if="!item.isTree"
              class="legend-symbol"
              :style="{
                borderColor: appStore.disabledCategories.has(item.bronId)
                  ? '#ccc'
                  : item.color,
                opacity: appStore.disabledCategories.has(item.bronId) ? 0.5 : 1,
              }"
            />
            <v-icon
              v-else
              :color="appStore.disabledTrees ? '#9e9e9e' : item.color"
              icon="mdi-tree"
              size="16"
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
        <div
          v-if="isTreePanel"
          class="details d-flex flex-row"
        >
          <div class="details__column tree__info">
            <h3 class="text-h6">
              Boom
              {{
                bomenLocationsStore.activeTree?.properties?.boomnaam || "..."
              }}
            </h3>
            <div>Tree info</div>
          </div>
          <div class="details__column tree__graph">
            <div>Graph</div>
          </div>
        </div>
        <div
          v-else
          class="details d-flex flex-row"
        >
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
  import { useBomenLocationsStore } from "@/stores/bomenLocations";
  import { useChartTimeseriesStore } from "@/stores/chartTimeseries";
  import { usePeilfilterDataStore } from "@/stores/peilfilterData";

  const appStore = useAppStore();
  const chartTimeseriesStore = useChartTimeseriesStore();
  const depthInfoStore = useDepthInfoStore();
  const locationsStore = useLocationsStore();
  const bomenLocationsStore = useBomenLocationsStore();
  const peilfilterDataStore = usePeilfilterDataStore();

  const panelIsCollapsed = computed(() => appStore.panelIsCollapsed);
  const isTreePanel = computed(() => !!bomenLocationsStore.activeTree);

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
          key: `provider-${bronId}`,
          bronId,
          dataleverancier,
          color: getColorForBronId(bronId),
        });
      }
    });

    const providers = Array.from(uniqueProviders.values()).sort(
      (a, b) => a.bronId - b.bronId
    );
    if (bomenLocationsStore.bomenLocations?.length > 0) {
      providers.push({
        key: "trees",
        bronId: null,
        dataleverancier: "Bomen",
        color: "#00a651",
        isTree: true,
      });
    }
    return providers;
  });

  function onLegendItemClick(item) {
    if (!item) return;
    if (item.isTree) {
      appStore.toggleTrees();
      return;
    }
    if (item.bronId == null) return;
    appStore.toggleCategory(item.bronId);
  }

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

  function hasNonEmptyValue(value) {
    return value != null && value !== "";
  }

  const hasValidDLabel = computed(() => hasNonEmptyValue(peilfilterDataStore.dlabelFilter));
  const hasValidPompId = computed(() => hasNonEmptyValue(peilfilterDataStore.pompidFilter));

  function clearPanelDataStores() {
    chartTimeseriesStore.clearData();
    peilfilterDataStore.clearData();
    depthInfoStore.clearData();
  }

  function commaSplit(str) {
    if (typeof str !== "string") return [];
    return str.split(",").map((s) => s.trim());
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

  watch(
    [() => locationsStore.activeLocation, () => selectedPeilfilterId.value],
    ([loc, peilfilterId]) => {
      if (!loc) return;

      if (peilfilterId != null && peilfilterId !== "") {
        peilfilterDataStore.fetchPeilfilterData(peilfilterId);
      } else {
        peilfilterDataStore.clearData();
      }

      const x = loc.geometry?.coordinates?.[0];
      const y = loc.geometry?.coordinates?.[1];
      const pointId =
        peilfilterId != null && peilfilterId !== ""
          ? peilfilterId
          : loc.properties?.locatie_id;

      if (x == null || y == null || pointId == null || pointId === "") {
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

.tree__info,
.tree__graph {
  flex: 1 1 0;
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
