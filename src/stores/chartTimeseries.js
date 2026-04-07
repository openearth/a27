import { defineStore } from 'pinia'
import getTimeseriesData from '@/lib/get-timeseries-data'

function pointInfoIncomplete(p) {
  return !p || p.id == null || p.id === '' || p.x == null || p.y == null
}

export const useChartTimeseriesStore = defineStore('chartTimeseries', {
  state: () => ({
    groundwaterTimeseries: null,
    precipitationTimeseries: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchTimeseriesData(pointinfo) {
      if (pointInfoIncomplete(pointinfo)) {
        this.groundwaterTimeseries = null
        this.precipitationTimeseries = null
        this.error = null
        return
      }

      this.loading = true
      this.error = null

      try {
        const response = await getTimeseriesData(pointinfo)
        this.groundwaterTimeseries = response?.groundwater?.timeseries ?? null
        this.precipitationTimeseries = response?.precipitation?.timeseries ?? null
      } catch (error) {
        console.error('Failed to fetch chart timeseries:', error)
        this.error = error
        this.groundwaterTimeseries = null
        this.precipitationTimeseries = null
      } finally {
        this.loading = false
      }
    },

    clearData() {
      this.groundwaterTimeseries = null
      this.precipitationTimeseries = null
      this.error = null
      this.loading = false
    },
  },
})
