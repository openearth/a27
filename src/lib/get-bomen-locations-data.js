import sendWpsRequest from '@/lib/wps'

export default async function getBomenLocationsData () {
  const response = await sendWpsRequest({
    identifier: 'wps_get_bomen_locations',
    inputs: [],
    outputIdentifier: 'bomen_locations',
    mimeType: 'application/json',
  })

  if (response?.errMsg) {
    throw new Error(response.errMsg)
  }

  return response
}
