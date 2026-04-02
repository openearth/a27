import { defineStore } from 'pinia'
import getDepthInfo from '@/lib/get_depth_info'

export const useDepthInfoStore = defineStore('depthInfo', {
  state: () => ({
    data: null,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchDepthInfo(peilfilterIds) {
      if (!Array.isArray(peilfilterIds) || peilfilterIds.length === 0) {
        this.data = null
        this.error = null
        return
      }

      this.loading = true
      this.error = null

      try {
        this.data = await getDepthInfo(peilfilterIds)
      } catch (error) {
        console.error('Failed to fetch depth info:', error)
        this.error = error
        this.data = null
      } finally {
        this.loading = false
      }
    },

    clearData() {
      this.data = null
      this.error = null
      this.loading = false
    },
  },
})
