<template>
  <div class="peilfilter-graph-wrapper">
    <div
      v-show="!depthInfoStore.loading"
      ref="chartRef"
      class="peilfilter-graph"
    />
    <div
      v-show="depthInfoStore.loading"
      class="peilfilter-graph-loading"
    >
      <v-progress-circular
        color="primary"
        indeterminate
      />
    </div>
  </div>
</template>

<script setup>
  import * as echarts from "echarts";
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useDepthInfoStore } from "@/stores/depthInfo";
  import { usePeilfilterDataStore } from "@/stores/peilfilterData";

  const chartRef = ref(null);
  let chartInstance = null;
  const depthInfoStore = useDepthInfoStore();
  const peilfilterDataStore = usePeilfilterDataStore();

  const highlightedPeilfilterId = computed(() => peilfilterDataStore.peilfilterId ?? null);

  const LINE_WIDTH = 3;
  const SYMBOL_SIZE = 6;
  const LABEL_STYLE = { fontSize: 12, color: "#000" };
  const GRID = { left: 50, right: 50, top: 50, bottom: 50, containLabel: true };

  const NAP_MARK_LINE = {
    silent: true,
    symbol: "none",
    lineStyle: { color: "#999", width: 1 },
    data: [{ yAxis: 0 }],
    label: { show: true, formatter: () => "NAP", fontSize: 12, color: "#333" },
  };

  /** Map API depth info (meters) to chart data (cm NAP). */
  function mapDepthResponseToChartData(api) {
    if (!api?.filters?.length) return null;
    const mToCm = (m) => (m != null && typeof m === "number" ? Math.round(m * 100) : null);
    const topValue = mToCm(api.peilbuis_top);
    const filterList = api.filters
      .map((f) => ({
        id: f.peilfilter_id,
        top: mToCm(f.filter_top),
        bottom: mToCm(f.filter_bottom),
      }))
      .filter((p) => p.top != null && p.bottom != null)
      .sort((a, b) => a.bottom - b.bottom);
    if (filterList.length === 0) return null;
    const bottomValue =
      api.peilbuis_bottom != null
        ? mToCm(api.peilbuis_bottom)
        : Math.min(...filterList.map((p) => p.bottom));
    const topValueResolved = topValue ?? Math.max(...filterList.map((p) => p.top));
    return { topValue: topValueResolved, bottomValue, peilfilters: filterList };
  }

  function point(y, opts = {}) {
    const { symbolSize = SYMBOL_SIZE, itemStyle, label } = opts;
    return {
      value: [0, y],
      symbolSize,
      ...(itemStyle && { itemStyle }),
      ...(label && { label: { show: true, ...label } }),
    };
  }

  function updateChart(chartData, highlightedId) {
    if (!chartInstance || !chartRef.value || !chartData) return;

    const { topValue, bottomValue, peilfilters } = chartData;
    const yValues = [topValue, bottomValue, 0, ...peilfilters.flatMap((p) => [p.top, p.bottom])];
    const yMin = Math.min(...yValues) - 10;
    const yMax = Math.max(...yValues) + 10;

    const segmentColor = (highlight) => (highlight ? "#e53935" : "#000");
    const series = [];
    let currentY = bottomValue;

    const bottomLabel = { formatter: () => `${bottomValue} cm`, position: "bottom", ...LABEL_STYLE };
    const topLabel = { formatter: () => `${topValue} cm`, position: "top", ...LABEL_STYLE };
    const leftLabel = (val) => ({ formatter: () => `${val} cm`, position: "left", ...LABEL_STYLE });

    peilfilters.forEach((pf, index) => {
      const highlight = highlightedId != null && highlightedId === pf.id;
      const color = segmentColor(highlight);
      const prevHighlighted = index > 0 && highlightedId != null && highlightedId === peilfilters[index - 1].id;
      const connectorStartColor = currentY === bottomValue ? undefined : segmentColor(prevHighlighted);

      series.push({
        type: "line",
        ...(index === 0 && { markLine: NAP_MARK_LINE }),
        data: [
          point(currentY, {
            symbolSize: currentY === bottomValue ? 0 : SYMBOL_SIZE,
            ...(connectorStartColor && { itemStyle: { color: connectorStartColor } }),
            ...(currentY === bottomValue && { label: bottomLabel }),
          }),
          point(pf.bottom, { itemStyle: { color }, label: leftLabel(pf.bottom) }),
        ],
        symbol: "circle",
        symbolSize: SYMBOL_SIZE,
        itemStyle: { color: "#000" },
        lineStyle: { width: LINE_WIDTH, color: "#000" },
      });

      series.push({
        type: "line",
        data: [
          point(pf.bottom, { itemStyle: { color } }),
          point(pf.top, { itemStyle: { color }, label: leftLabel(pf.top) }),
        ],
        symbol: "circle",
        symbolSize: SYMBOL_SIZE,
        lineStyle: { width: LINE_WIDTH, color },
      });

      currentY = pf.top;
    });

    const lastHighlighted = peilfilters.length > 0 && highlightedId != null && highlightedId === peilfilters[peilfilters.length - 1].id;
    const finalStartColor = currentY === bottomValue ? undefined : segmentColor(lastHighlighted);

    series.push({
      type: "line",
      ...(peilfilters.length === 0 && { markLine: NAP_MARK_LINE }),
      data: [
        point(currentY, {
          symbolSize: currentY === bottomValue ? 0 : SYMBOL_SIZE,
          ...(finalStartColor && { itemStyle: { color: finalStartColor } }),
          ...(currentY === bottomValue && { label: bottomLabel }),
        }),
        point(topValue, { symbolSize: 0, label: topLabel }),
      ],
      symbol: "circle",
      symbolSize: SYMBOL_SIZE,
      itemStyle: { color: "#000" },
      lineStyle: { width: LINE_WIDTH, color: "#000" },
    });

    chartInstance.setOption(
      {
        animation: false,
        grid: GRID,
        xAxis: { type: "value", min: -0.5, max: 0.5, show: false },
        yAxis: { type: "value", min: yMin, max: yMax, show: false },
        series,
      },
      { notMerge: true }
    );
  }

  function initChart() {
    if (!chartRef.value) return;
    if (chartInstance) chartInstance.dispose();
    chartInstance = echarts.init(chartRef.value);
  }

  const chartData = computed(() => mapDepthResponseToChartData(depthInfoStore.data));

  function refreshChart() {
    const data = chartData.value;
    nextTick(() => updateChart(data, highlightedPeilfilterId.value));
  }

  onMounted(() => {
    initChart();
    refreshChart();
  });

  watch([chartData, highlightedPeilfilterId], () => {
    refreshChart();
  });

  onBeforeUnmount(() => chartInstance?.dispose());
</script>

<style scoped>
.peilfilter-graph-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.peilfilter-graph {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.peilfilter-graph-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
