<template>
  <div class="timeseries-chart-wrapper">
    <div
      v-show="!chartDataLoading"
      ref="chartRef"
      class="timeseries-chart"
    />
    <div
      v-show="chartDataLoading"
      class="timeseries-chart-loading"
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
  import { useChartTimeseriesStore } from "@/stores/chartTimeseries";

  const chartRef = ref(null);
  let chartInstance = null;
  const chartTimeseriesStore = useChartTimeseriesStore();

  const chartDataLoading = computed(() => chartTimeseriesStore.loading);

  const Y_AXIS_GROUNDWATER = { type: "value", name: "Grondwaterstand [cm NAP]", nameLocation: "middle", nameGap: 50, nameTextStyle: { fontSize: 13 } };
  const Y_AXIS_PRECIP = { type: "value", name: "Neerslag [mm]", nameLocation: "middle", nameGap: 50, nameTextStyle: { fontSize: 13 }, position: "right" };
  const SERIES_BASE = { type: "scatter", symbolSize: 4, showSymbol: false, animation: false, progressive: 0 };
  const PRECIP_SERIES = { type: "bar", barWidth: 1.5, barMinHeight: 1, itemStyle: { color: "#4aa3ff" }, animation: false };

  function formatDate(value) {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getPrecipitationValue(point) {
    if (point == null || typeof point !== "object") return null;
    const v = point.value ?? point.precipitation ?? point.amount;
    return typeof v === "number" ? v : null;
  }

  function getPrecipitationDatetime(point) {
    if (point == null || typeof point !== "object") return null;
    return point.datetime ?? point.date ?? null;
  }

  function updateChart(gwTimeseries, precipTimeseries) {
    if (!chartInstance) return;
    const gw = Array.isArray(gwTimeseries) ? gwTimeseries : [];
    let precip = Array.isArray(precipTimeseries) ? precipTimeseries : [];
    precip = precip.filter((t) => t && t.show !== false);
    const gwPoints = gw
      .map((t) => (t?.datetime ? [t.datetime, t.head ?? null] : null))
      .filter((point) => point != null);
    const precipPoints = precip
      .map((t) => {
        const dt = getPrecipitationDatetime(t);
        const value = getPrecipitationValue(t);
        return dt != null && value != null ? [dt, value] : null;
      })
      .filter((point) => point != null);
    const hasPrecip = precipPoints.length > 0;
    chartInstance.setOption({
      xAxis: { type: "time" },
      yAxis: hasPrecip ? [Y_AXIS_GROUNDWATER, Y_AXIS_PRECIP] : Y_AXIS_GROUNDWATER,
      series: hasPrecip
        ? [
          { ...SERIES_BASE, name: "Grondwaterstand", data: gwPoints, yAxisIndex: 0 },
          { ...PRECIP_SERIES, name: "Neerslag", data: precipPoints, yAxisIndex: 1 },
        ]
        : [{ ...SERIES_BASE, name: "Grondwaterstand", data: gwPoints }],
    });
  }

  function initChart() {
    if (chartInstance) {
      chartInstance.dispose();
    }
    chartInstance = echarts.init(chartRef.value);
    chartInstance.setOption({
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      title: {
        text: "Tijdserie grondwaterstanden",
        top: 8,
        left: 0,
      },
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          if (!params || !params.length) return "";
          const formattedDate = formatDate(params[0].axisValue);
          let result = `${formattedDate}<br/>`;
          params.forEach((param) => {
            const unit = param.seriesName === "Neerslag" ? " mm" : " cm NAP";
            const val = Array.isArray(param.value) ? param.value[1] : param.value;
            const display = val != null && !Number.isNaN(Number(val)) ? Number(val).toFixed(2) : "–";
            result += `${param.marker} ${param.seriesName}: ${display}${unit}<br/>`;
          });
          return result;
        },
      },
      legend: {
        top: 34,
        left: "center",
      },
      grid: {
        left: 80,
        right: 80,
        bottom: 120,
        top: 86,
      },
      dataZoom: [
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 25,
          bottom: 20,
          brushSelect: false,
          labelFormatter: (value) => formatDate(value),
        },
        {
          type: "inside",
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: "time",
        splitNumber: 12,
        name: "Datum [-]",
        nameLocation: "middle",
        nameGap: 55,
        nameTextStyle: {
          fontSize: 13,
        },
        axisLabel: {
          formatter: formatDate,
          rotate: 25,
          hideOverlap: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#e0e0e0",
            type: "solid",
            opacity: 0.2,
          },
        },
      },
      yAxis: {
        type: "value",
        name: "Grondwaterstand [cm NAP]",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: {
          fontSize: 13,
        },
      },
      series: [{ ...SERIES_BASE, name: "Grondwaterstand", data: [] }],
    });
  }

  onMounted(() => {
    initChart();
  });

  onBeforeUnmount(() => {
    if (chartInstance) {
      chartInstance.dispose();
    }
  });

  watch(
    () => [
      chartTimeseriesStore.groundwaterTimeseries,
      chartTimeseriesStore.precipitationTimeseries,
      chartTimeseriesStore.loading,
    ],
    ([gw, precip, loading]) => {
      if (loading) return;
      nextTick(() => updateChart(gw ?? [], precip ?? []));
    },
    { immediate: true }
  );
</script>

<style scoped>
.timeseries-chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.timeseries-chart {
  width: 100%;
  height: 100%;
  position: relative;
}

.timeseries-chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
