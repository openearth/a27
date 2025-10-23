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
      if (this.disabledCategories.has(bronId)) {
        this.disabledCategories.delete(bronId)
      } else {
        this.disabledCategories.add(bronId)
      }
    },
  },
})
