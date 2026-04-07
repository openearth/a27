import { defineStore } from 'pinia'

export const usePeilfilterDataStore = defineStore('peilfilterData', {
  state: () => ({
    peilfilterId: null,
    dlabelFilter: null,
    pompidFilter: null,
  }),

  actions: {
    setPeilfilterDetails({ peilfilterId = null, dlabelFilter = null, pompidFilter = null } = {}) {
      this.peilfilterId = peilfilterId ?? null
      this.dlabelFilter = dlabelFilter ?? null
      this.pompidFilter = pompidFilter ?? null
    },

    clearData() {
      this.peilfilterId = null
      this.dlabelFilter = null
      this.pompidFilter = null
    },
  },
})
