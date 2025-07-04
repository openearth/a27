import geoServerUrl from './geoserver-url'

export default async function getTimeseriesData (peilfilterId) {
  if (!peilfilterId) {
    throw new Error('No peilfilterId provided to getTimeseriesData')
  }
  const peilfilterinfo = JSON.stringify({
    peilfilterid: peilfilterId,
    start_date: '',
    end_date: '',
  })

  const url = geoServerUrl({
    url: import.meta.env.VITE_GEOSERVER_BASE_URL + '/wps',
    request: 'Execute',
    service: 'wps',
    version: '2.0.0',
    Identifier: 'wps_get_peilfilter_data',
    datainputs: `peilfilterinfo=${peilfilterinfo}`,
  })

  return fetch(url)
    .then(response => response.text())
    .then(string => {
      const document = new window.DOMParser().parseFromString(string, 'text/xml')

      const method = 'getElementsByTagName'
      const element = document[method]('wps:ComplexData')

      if (element.length === 0) {
        console.warn('No <wps:ComplexData> found. Raw XML:', string)
        throw new Error('No <wps:ComplexData> element found')
      }
      const value = JSON.parse(element[0].textContent)

      if (value.errMsg) {
        throw new Error(value.errMsg)
      }

      return value
    })
    .catch(error => {
      console.error('Failed to fetch timeseries:', error)
      throw error
    })
}
