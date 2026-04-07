import sendWpsRequest from '@/lib/wps'

export default async function getTimeseriesData(pointinfo) {
  if (!pointinfo || pointinfo.id == null || pointinfo.id === '') {
    throw new Error('pointinfo.id is required for getTimeseriesData')
  }
  if (pointinfo.x == null || pointinfo.y == null) {
    throw new Error('pointinfo.x and pointinfo.y are required for getTimeseriesData')
  }

  const response = await sendWpsRequest({
    identifier: 'wps_get_timeseries_data',
    inputs: [
      {
        id: 'pointinfo',
        title: 'point info as JSON: {\'id\', \'x\', \'y\'}',
        type: 'ComplexData',
        mimeType: 'application/json',
        value: {
          id: String(pointinfo.id),
          x: Number(pointinfo.x),
          y: Number(pointinfo.y),
        },
      },
    ],
    outputIdentifier: 'timeseries_data',
    mimeType: 'application/json',
  })

  if (response?.errMsg) {
    throw new Error(response.errMsg)
  }

  return response
}
