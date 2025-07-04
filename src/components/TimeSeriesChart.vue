<template>
  <div ref="chartRef" class="timeseries-chart" />
</template>

<script setup>
  import * as echarts from 'echarts'
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

  const props = defineProps({
    locationId: {
      type: String,
      default: null,
    },
  })

  const chartRef = ref(null)
  let chartInstance = null

  function initChart () {
    if (chartInstance) {
      chartInstance.dispose()
    }
    chartInstance = echarts.init(chartRef.value)
    const option = {
      title: {
        text: 'Time Series Data',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: generateFakeDates(),
      },
      yAxis: {
        type: 'value',
      },
      series: [{
        name: 'Value',
        type: 'line',
        data: generateFakeData(),
      }],
    }
    chartInstance.setOption(option)
  }

  function generateFakeDates () {
    // Generate 10 fake date strings
    const dates = []
    const now = new Date()
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  function generateFakeData () {
    return Array.from({ length: 10 }, () => Math.round(Math.random() * 100))
  }

  onMounted(() => {
    initChart()
  })

  onBeforeUnmount(() => {
    if (chartInstance) {
      chartInstance.dispose()
    }
  })

  watch(() => props.locationId, () => {
    // For now we just regenerate fake data when location changes
    if (chartInstance) {
      chartInstance.setOption({
        xAxis: {
          data: generateFakeDates(),
        },
        series: [{
          data: generateFakeData(),
        }],
      })
    }
  })
</script>

<style scoped>
.timeseries-chart {
  width: 100%;
  height: 100%;
}
</style>
