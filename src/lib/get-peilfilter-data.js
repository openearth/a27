import sendWpsRequest from '@/lib/wps'

export default async function getPeilfilterData(peilfilterId) {
  if (peilfilterId == null || peilfilterId === '') {
    throw new Error('peilfilterId is required for getPeilfilterData')
  }

  const response = await sendWpsRequest({
    identifier: 'wps_get_peilfilter_data',
    inputs: [
      {
        id: 'peilfilterinfo',
        title: 'Peilfilterinfo as peilfilterId, StartDate and EndDate',
        type: 'ComplexData',
        mimeType: 'application/json',
        value: {
          peilfilterid: peilfilterId,
          start_date: '',
          end_date: '',
        },
      },
    ],
    outputIdentifier: 'peilfilter_data',
    mimeType: 'application/json',
  })

  if (response?.errMsg) {
    throw new Error(response.errMsg)
  }

  return response
}
