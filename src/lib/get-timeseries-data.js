export default async function getTimeseriesData (peilfilterId = 530) {
  const url = `https://a27.openearth.nl/wps?service=wps&request=Execute&version=2.0.0&Identifier=wps_get_peilfilter_data&datainputs=peilfilterinfo=${encodeURIComponent(
    JSON.stringify({
      peilfilterid: peilfilterId,
      start_date: '',
      end_date: '',
    }),
  )}`

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
