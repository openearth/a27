// stores/peilfilterData.js
import { defineStore } from 'pinia'
import getTimeseriesData from '@/lib/get-timeseries-data'

export const usePeilfilterDataStore = defineStore('peilfilterData', {
  state: () => ({
    data: null, // Stores the full response from getTimeseriesData
    loading: false,
    error: null,
  }),
  
  getters: {
    // Get dlabel_filter for the current peilfilterId
    dlabelFilter (state) {
      if (!state.data || !state.data.locationproperties || !state.data.locationproperties.peilfilter_id) {
        return null
      }
      return state.data.locationproperties.dlabel_filter
    },
    
    // Get the peilfilter_id from the current data
    peilfilterId (state) {
      if (!state.data || !state.data.locationproperties) {
        return null
      }
      return state.data.locationproperties.peilfilter_id
    },
  },
  
  actions: {
    async fetchPeilfilterData (peilfilterId, startDate = '', endDate = '') {
      if (!peilfilterId) {
        this.data = null
        this.error = null
        return
      }

      this.loading = true
      this.error = null
      
      try {
        const response = await getTimeseriesData(peilfilterId, startDate, endDate)
        this.data = response
      } catch (error) {
        console.error('Failed to fetch peilfilter data:', error)
        this.error = error
        this.data = null
      } finally {
        this.loading = false
      }
    },
    
    clearData () {
      this.data = null
      this.error = null
      this.loading = false
    },
  },
})
