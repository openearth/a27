import { defineStore } from 'pinia'
import getPeilfilterData from '@/lib/get-peilfilter-data'

export const usePeilfilterDataStore = defineStore('peilfilterData', {
  state: () => ({
    data: null,
    activePeilfilterId: null,
    loading: false,
    error: null,
  }),

  getters: {
    dlabelFilter(state) {
      return state.data?.locationproperties?.dlabel_filter ?? null
    },

    pompidFilter(state) {
      return state.data?.locationproperties?.pompid_filter ?? null
    },

    peilfilterId(state) {
      return state.data?.locationproperties?.peilfilter_id ?? state.activePeilfilterId
    },
  },

  actions: {
    async fetchPeilfilterData(peilfilterId) {
      if (peilfilterId == null || peilfilterId === '') {
        this.clearData()
        return
      }

      this.activePeilfilterId = String(peilfilterId)
      this.loading = true
      this.error = null

      try {
        this.data = await getPeilfilterData(this.activePeilfilterId)
      } catch (error) {
        console.error('Failed to fetch peilfilter data:', error)
        this.error = error
        this.data = null
      } finally {
        this.loading = false
      }
    },

    clearData() {
      this.data = null
      this.activePeilfilterId = null
      this.error = null
      this.loading = false
    },
  },
})
