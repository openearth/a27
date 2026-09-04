<template>
  <div class="tree-health-chart-wrapper">
    <div
      ref="chartRef"
      class="tree-health-chart"
    />
    <div
      v-if="chartDataLoading"
      class="tree-health-chart-loading"
    >
      <v-progress-circular
        color="primary"
        indeterminate
      />
    </div>
  </div>
</template>

<script setup>
  import * as echarts from 'echarts'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import {
    DEFAULT_TREE_HEALTH_LABELS,
    TREE_COLOR,
    TREE_GROUP_AVG_COLOR,
  } from '@/lib/constants'
  import { useBoomDataStore } from '@/stores/boomData'

  const chartRef = ref(null)
  let chartInstance = null
  let resizeObserver = null
  const boomDataStore = useBoomDataStore()

  const chartDataLoading = computed(() => boomDataStore.loading)

  const SCATTER_SERIES = {
    type: 'scatter',
    symbolSize: 8,
    showSymbol: true,
    animation: false,
  }

  function formatDate (value) {
    const date = new Date(value)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  function getLabelAtIndex (labels, index) {
    if (!Number.isFinite(index) || index < 0 || index >= labels.length) {
      return String(index ?? '–')
    }
    return labels[index]
  }

  function getHealthLabel (labels, value) {
    const num = Number(value)
    if (!Number.isFinite(num)) {
      return String(value ?? '–')
    }
    return getLabelAtIndex(labels, Math.round(num))
  }

  function formatTooltipHealthLabel (labels, value) {
    const yLabels = labels.length > 0 ? labels : DEFAULT_TREE_HEALTH_LABELS
    const num = Number(value)
    if (!Number.isFinite(num)) {
      return String(value ?? '–')
    }

    const floorIdx = Math.floor(num)
    const ceilIdx = Math.ceil(num)

    if (floorIdx === ceilIdx) {
      return getLabelAtIndex(yLabels, floorIdx)
    }

    return `(${getLabelAtIndex(yLabels, floorIdx)} ↔ ${getLabelAtIndex(yLabels, ceilIdx)})`
  }

  function mapTimeseriesToPoints (timeseries) {
    if (!Array.isArray(timeseries)) return []

    return timeseries
      .map((point) => {
        if (!point?.date || point.health_value == null) return null
        return [ point.date, Number(point.health_value) ]
      })
      .filter((point) => point != null && !Number.isNaN(point[1]))
  }

  function findPointAtDate (timeseries, dateValue) {
    const dateMs = new Date(dateValue).getTime()
    return timeseries.find((p) => new Date(p.date).getTime() === dateMs)
  }

  function hasChartDimensions () {
    const el = chartRef.value
    return Boolean(el && el.clientWidth > 0 && el.clientHeight > 0)
  }

  function buildScatterSeries (name, points, color) {
    return {
      ...SCATTER_SERIES,
      name,
      data: points,
      itemStyle: { color },
    }
  }

  function updateChart () {
    if (!chartInstance) return

    const yLabels = boomDataStore.yAxisLabels.length > 0
      ? boomDataStore.yAxisLabels
      : DEFAULT_TREE_HEALTH_LABELS
    const treeTimeseries = boomDataStore.treeTimeseries
    const groupTimeseries = boomDataStore.groupAverageTimeseries
    const treeName = boomDataStore.treeName
    const groupName = boomDataStore.groupThatBelongs

    const treePoints = mapTimeseriesToPoints(treeTimeseries)
    const groupPoints = mapTimeseriesToPoints(groupTimeseries)
    const treeSeriesName = treeName ?? 'Geselecteerde boom'
    const groupSeriesName = groupName
      ? `Gemiddelde ${groupName}`
      : 'Groepsgemiddelde'

    const series = [
      buildScatterSeries(treeSeriesName, treePoints, TREE_COLOR),
    ]

    if (groupPoints.length > 0) {
      series.push(buildScatterSeries(groupSeriesName, groupPoints, TREE_GROUP_AVG_COLOR))
    }

    chartInstance.setOption(
      {
        title: {
          text: treeName ? `Gezondheid boom ${treeName}` : 'Gezondheid boom',
          top: 8,
          left: 0,
        },
        legend: {
          top: 34,
          left: 'center',
        },
        grid: {
          left: 140,
          right: 40,
          bottom: 120,
          top: 86,
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            if (!params?.length) return ''
            const dateValue = Array.isArray(params[0].value)
              ? params[0].value[0]
              : params[0].axisValue
            let result = `${formatDate(dateValue)}<br/>`
            params.forEach((param) => {
              const value = Array.isArray(param.value) ? param.value[1] : param.value
              const sourceTimeseries = param.seriesName === groupSeriesName
                ? groupTimeseries
                : treeTimeseries
              const rawPoint = findPointAtDate(sourceTimeseries, dateValue)
              const label = rawPoint?.health_label
                ?? formatTooltipHealthLabel(yLabels, value)
              result += `${param.marker} ${param.seriesName}: ${label} (${value})<br/>`
            })
            return result
          },
        },
        xAxis: {
          type: 'time',
          splitNumber: 16,
          name: 'Datum [-]',
          nameLocation: 'middle',
          nameGap: 55,
          nameTextStyle: { fontSize: 13 },
          axisLabel: {
            formatter: formatDate,
            rotate: 25,
            hideOverlap: false,
          },
          splitLine: {
            show: true,
            lineStyle: { color: '#e0e0e0', type: 'solid', opacity: 0.2 },
          },
        },
        yAxis: {
          type: 'value',
          min: boomDataStore.yAxisMin,
          max: boomDataStore.yAxisMax,
          interval: 1,
          name: 'Gezondheid [-]',
          nameLocation: 'middle',
          nameGap: 110,
          nameTextStyle: { fontSize: 13 },
          axisLabel: {
            formatter: (value) => getHealthLabel(yLabels, value),
          },
          splitLine: {
            show: true,
            lineStyle: { color: '#e0e0e0', type: 'solid', opacity: 0.2 },
          },
        },
        series,
      },
      { notMerge: true },
    )
  }

  function resizeChart () {
    if (!chartInstance || !hasChartDimensions()) return
    chartInstance.resize()
  }

  function initChart () {
    if (!hasChartDimensions()) return false
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
    chartInstance = echarts.init(chartRef.value)
    return true
  }

  function ensureChartReady () {
    if (!hasChartDimensions()) return false
    if (!chartInstance) {
      return initChart()
    }
    return true
  }

  function refreshChart () {
    nextTick(() => {
      if (!ensureChartReady()) return
      updateChart()
      resizeChart()
    })
  }

  function handleContainerResize () {
    if (!hasChartDimensions()) return
    if (!chartInstance) {
      refreshChart()
      return
    }
    resizeChart()
  }

  onMounted(() => {
    if (chartRef.value) {
      resizeObserver = new ResizeObserver(() => handleContainerResize())
      resizeObserver.observe(chartRef.value)
    }
    refreshChart()
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
    chartInstance?.dispose()
    chartInstance = null
  })

  watch(
    () => boomDataStore.data,
    () => {
      if (!boomDataStore.loading) {
        refreshChart()
      }
    },
    { deep: true },
  )

  watch(
    () => boomDataStore.loading,
    (loading) => {
      if (!loading) {
        refreshChart()
      }
    },
  )
</script>

<style scoped>
.tree-health-chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.tree-health-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: relative;
}

.tree-health-chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  z-index: 1;
}
</style>
