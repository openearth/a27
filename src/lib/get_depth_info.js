import sendWpsRequest from '@/lib/wps'

/**
 * Fetches depth info (peilbuis top/bottom and filter segments) for given peilfilter IDs.
 * @param {number[]} peilfilterIds - Array of peilfilter IDs (e.g. from activeLocation.properties.peilfilter_ids)
 * @returns {Promise<{ peilbuis_top: number, peilbuis_bottom: number|null, filters: Array<{ peilfilter_id: number, filter_top: number, filter_bottom: number }> }>}
 */
export default async function getDepthInfo(peilfilterIds) {
  if (!Array.isArray(peilfilterIds) || peilfilterIds.length === 0) {
    throw new Error('peilfilterIds must be a non-empty array')
  }

  const ids = peilfilterIds.map((id) => Number(id)).filter((n) => !Number.isNaN(n))
  if (ids.length === 0) {
    throw new Error('peilfilterIds must contain valid numbers')
  }

  const response = await sendWpsRequest({
    identifier: 'wps_get_depth_info',
    inputs: [
      {
        id: 'peilfilter_ids',
        title: 'Peilfilter IDs as array',
        type: 'ComplexData',
        mimeType: 'application/json',
        value: ids,
      },
    ],
    outputIdentifier: 'depth_info',
    mimeType: 'application/json',
  })

  if (response?.errMsg) {
    throw new Error(response.errMsg)
  }

  return response
}
