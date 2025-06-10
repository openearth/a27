// stores/locations.js
import { defineStore } from 'pinia'
import getLocationsData from '@/lib/get-locations-data'

export const useLocationsStore = defineStore('locations', {
  state: () => ({
    locations: [],
  }),
  actions: {
    async fetchLocations () {
      try {
        const { features } = await getLocationsData()
        this.locations = features
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      }
    },
  },
})
