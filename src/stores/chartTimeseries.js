// Combined groundwater + precipitation series for TimeSeriesChart (single WPS call)
import { defineStore } from 'pinia'
import getTimeseriesData from '@/lib/get-timeseries-data'

export const useChartTimeseriesStore = defineStore('chartTimeseries', {
  state: () => ({
    groundwaterTimeseries: null,
    precipitationTimeseries: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchTimeseriesData(pointinfo) {
      if (!pointinfo || pointinfo.id == null || pointinfo.id === '' || pointinfo.x == null || pointinfo.y == null) {
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
