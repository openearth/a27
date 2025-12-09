<template>
  <div ref="chartRef" class="timeseries-chart" />
</template>

<script setup>
  import * as echarts from "echarts";
  import { onBeforeUnmount, onMounted, ref, watch } from "vue";
  import getTimeseriesData from "@/lib/get-timeseries-data";

  const props = defineProps({
    peilfilterId: {
      type: [String, Number],
      default: null,
    },
  });

  const chartRef = ref(null);
  let chartInstance = null;

  function initChart() {
    if (chartInstance) {
      chartInstance.dispose();
    }
    chartInstance = echarts.init(chartRef.value);
    chartInstance.setOption({
      title: {
        text: "Tijdserie grondwaterstanden",
      },
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          // const dataIndex = params[0].dataIndex;
          const rawDate = params[0].name;
          const date = new Date(rawDate);
          const day = String(date.getDate()).padStart(2, "0");
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const year = date.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;

          let result = `${formattedDate}<br/>`;
          params.forEach((param) => {
            result += `${param.marker} ${param.seriesName}: ${param.value} cm NAP<br/>`;
          });
          return result;
        },
      },
      grid: {
        left: 80,
        right: 50,
        bottom: 120,
        top: 60,
      },
      dataZoom: [
        {
          type: "slider",
          start: 0,
          end: 100,
          height: 25,
          bottom: 20,
          brushSelect: false,
          labelFormatter: (value, valueStr) => {
            const option = chartInstance.getOption();
            const xAxisData = option.xAxis[0].data;
            if (xAxisData && xAxisData[value]) {
              const date = new Date(xAxisData[value]);
              const day = String(date.getDate()).padStart(2, "0");
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            }
            return valueStr;
          },
        },
        {
          type: "inside",
          start: 0,
          end: 100,
        },
      ],
      xAxis: {
        type: "category",
        data: [],
        name: "Datum [-]",
        nameLocation: "middle",
        nameGap: 55,
        nameTextStyle: {
          fontSize: 13,
        },
        axisLabel: {
          formatter: (value) => {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          },
          rotate: 25,
          minInterval: 100000,
          maxInterval: 100000,
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
      series: [
        {
          name: "Grondwaterstand",
          type: "line",
          data: [],
        },
      ],
    });
  }

  async function loadData(peilfilterId) {
    try {
      const data = await getTimeseriesData(peilfilterId);
      const timeseries = data.timeseries || [];
      const xData = timeseries.map((t) => t.datetime);
      const yData = timeseries.map((t) => t.head);
      chartInstance.setOption({
        xAxis: {
          data: xData,
        },
        series: [
          {
            data: yData,
          },
        ],
      });
    } catch (error) {
      console.error("Error loading timeseries data:", error);
    }
  }

  onMounted(() => {
    initChart();
    if (props.peilfilterId) {
      loadData(props.peilfilterId);
    }
  });

  onBeforeUnmount(() => {
    if (chartInstance) {
      chartInstance.dispose();
    }
  });

  watch(
    () => props.peilfilterId,
    (newId) => {
      if (newId) {
        loadData(newId);
      }
    }
  );
</script>

<style scoped>
.timeseries-chart {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
