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
  const LABEL_MIN_GAP_PX = 14;
  const LABEL_STYLE = { fontSize: 12, color: "#000" };
  /** Horizontally center plot so x=0 (vertical line) aligns with column center; width leaves side space for labels. */
  const GRID = {
    left: "center",
    width: "82%",
    top: 52,
    bottom: 50,
    containLabel: false,
  };

  const NAP_MARK_LINE = {
    silent: true,
    symbol: "none",
    lineStyle: { color: "#999", width: 1 },
    data: [{ yAxis: 0 }],
    label: {
      show: true,
      formatter: () => "NAP",
      position: "insideStartTop",
      fontSize: 12,
      color: "#333",
    },
  };

  /** Map API depth info to chart data. */
  function mapDepthResponseToChartData(api) {
    if (!api?.filters?.length) return null;
    const topValue = api.peilbuis_top;
    const filterList = api.filters
      .map((f) => ({
        id: f.peilfilter_id,
        top: f.filter_top,
        bottom: f.filter_bottom,
      }))
      .filter((p) => p.top != null && p.bottom != null)
      .sort((a, b) => a.bottom - b.bottom);
    if (filterList.length === 0) return null;
    const bottomValue =
      api.peilbuis_bottom != null
        ? api.peilbuis_bottom
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

  function buildLeftLabelOffsets(peilfilters, yMin, yMax) {
    const plotHeight = Math.max((chartRef.value?.clientHeight ?? 0) - GRID.top - GRID.bottom, 120);
    const range = Math.max(yMax - yMin, 1);

    const entries = peilfilters.flatMap((pf) => [
      { key: `b-${pf.id}`, value: pf.bottom },
      { key: `t-${pf.id}`, value: pf.top },
    ]);

    const withPx = entries
      .map((e) => ({
        ...e,
        px: ((yMax - e.value) / range) * plotHeight,
      }))
      .sort((a, b) => a.px - b.px);

    const adjusted = [];
    withPx.forEach((entry, index) => {
      if (index === 0) {
        adjusted.push({ ...entry, adjustedPx: entry.px });
        return;
      }
      const prev = adjusted[index - 1];
      adjusted.push({
        ...entry,
        adjustedPx: Math.max(entry.px, prev.adjustedPx + LABEL_MIN_GAP_PX),
      });
    });

    const overflow = adjusted.length > 0 ? adjusted[adjusted.length - 1].adjustedPx - plotHeight : 0;
    if (overflow > 0) {
      adjusted.forEach((e) => {
        e.adjustedPx -= overflow;
      });
    }

    return adjusted.reduce((acc, e) => {
      acc[e.key] = Math.round(e.adjustedPx - e.px);
      return acc;
    }, {});
  }

  /** Compare as strings so v-select values (strings) match API peilfilter_id (often numbers). */
  function isHighlightedPeilfilter(highlightedId, peilfilterId) {
    if (highlightedId == null || peilfilterId == null) return false;
    return String(highlightedId) === String(peilfilterId);
  }

  function updateChart(chartData, highlightedId) {
    if (!chartInstance || !chartRef.value || !chartData) return;

    const { topValue, bottomValue, peilfilters } = chartData;
    const yValues = [topValue, bottomValue, 0, ...peilfilters.flatMap((p) => [p.top, p.bottom])];
    /** Control the resizing of the line, specially when the values are small. */
    const yMin = Math.min(...yValues) - 1;
    const yMax = Math.max(...yValues) + 1;

    const segmentColor = (highlight) => (highlight ? "#e53935" : "#000");
    const series = [];
    let currentY = bottomValue;

    const bottomLabel = { formatter: () => `${bottomValue} m`, position: "bottom", offset: [24, 0], ...LABEL_STYLE };
    const topLabel = { formatter: () => `${topValue} m`, position: "top", offset: [24, 0],...LABEL_STYLE };
    const leftOffsets = buildLeftLabelOffsets(peilfilters, yMin, yMax);
    const leftLabel = (key, val) => ({
      formatter: () => `${val} m`,
      position: "left",
      offset: [0, leftOffsets[key] ?? 0],
      ...LABEL_STYLE,
    });

    peilfilters.forEach((pf, index) => {
      const highlight = isHighlightedPeilfilter(highlightedId, pf.id);
      const color = segmentColor(highlight);
      const prevHighlighted = index > 0 && isHighlightedPeilfilter(highlightedId, peilfilters[index - 1].id);
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
          point(pf.bottom, { itemStyle: { color }, label: leftLabel(`b-${pf.id}`, pf.bottom) }),
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
          point(pf.top, { itemStyle: { color }, label: leftLabel(`t-${pf.id}`, pf.top) }),
        ],
        symbol: "circle",
        symbolSize: SYMBOL_SIZE,
        lineStyle: { width: LINE_WIDTH, color },
      });

      currentY = pf.top;
    });

    const lastHighlighted = peilfilters.length > 0
      && isHighlightedPeilfilter(highlightedId, peilfilters[peilfilters.length - 1].id);
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
        title: {
          text: "Peilbuisinformatie",
          textAlign: "left",
        },
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
