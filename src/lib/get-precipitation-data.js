import sendWpsRequest from '@/lib/wps'

export default async function getPrecipitationData (x, y, startDate = '', endDate = '') {
  if (x == null || y == null) {
    throw new Error('Coordinates x and y are required for getPrecipitationData')
  }
  const locationinfo = {
    x: Number(x),
    y: Number(y),
    start_date: startDate,
    end_date: endDate,
  }
  try {
    const response = await sendWpsRequest({
      identifier: 'wps_get_precipitation_data',
      inputs: [ {
        id: 'locationinfo',
        title: 'Retrieve timeseries precipitation data for selected coordinates (RD New EPSG:28992) for any date range (start_date and/or end_date can be empty strings)',
        type: 'ComplexData',
        mimeType: 'application/json',
        value: locationinfo,
      } ],
      outputIdentifier: 'precipitation_data',
      mimeType: 'application/json',
    })

    if (response.errMsg) {
      throw new Error(response.errMsg)
    }

    return response
  } catch (error) {
    console.error('Failed to fetch precipitation data:', error)
    throw error
  }
}
