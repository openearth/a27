import sendWpsRequest from '@/lib/wps'

export default async function getBoomData (boomcode) {
  if (boomcode == null || boomcode === '') {
    throw new Error('boomcode is required for getBoomData')
  }

  const response = await sendWpsRequest({
    identifier: 'wps_get_boom_data',
    inputs: [
      {
        id: 'boominfo',
        title: 'Boominfo as boomnaams array',
        type: 'ComplexData',
        mimeType: 'application/json',
        value: {
          boomnaams: [ String(boomcode) ],
        },
      },
    ],
    outputIdentifier: 'boom_data',
    mimeType: 'application/json',
  })

  if (response?.errMsg) {
    throw new Error(response.errMsg)
  }

  return response
}
