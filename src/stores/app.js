// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    panelIsCollapsed: true,
    disabledCategories: new Set(),
  }),
  actions: {
    collapsePanel () {
      this.panelIsCollapsed = true
    },
    expandPanel () {
      this.panelIsCollapsed = false
    },
    togglePanel () {
      this.panelIsCollapsed = !this.panelIsCollapsed
    },
    toggleCategory (bronId) {
      // Create a new Set to trigger reactivity in Pinia
      const newSet = new Set(this.disabledCategories)
      if (newSet.has(bronId)) {
        newSet.delete(bronId)
      } else {
        newSet.add(bronId)
      }
      this.disabledCategories = newSet
    },
  },
})
