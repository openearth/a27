import queryString from 'query-string'

/**
 * Create a GeoServer url.
 *
 * @param {object} options - The options object.
 * @returns {string} - The GeoServer url.
 */
export default function ({ url, service, request, encode = true, ...rest }) {
  if (!request) {
    return undefined
  }

  const options = { encode, sort: false }
  const params = queryString.stringify({ service, request, ...rest }, options)

  return `${url}?${params}`
}
