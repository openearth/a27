export const TREE_ICON_ID = 'tree-sdf-icon'

export function createTreeSdfImageData (size = 32) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#000'

  ctx.beginPath()
  ctx.arc(size * 0.38, size * 0.38, size * 0.16, 0, Math.PI * 2)
  ctx.arc(size * 0.62, size * 0.38, size * 0.16, 0, Math.PI * 2)
  ctx.arc(size * 0.5, size * 0.28, size * 0.18, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(size * 0.28, size * 0.5)
  ctx.lineTo(size * 0.72, size * 0.5)
  ctx.lineTo(size * 0.5, size * 0.7)
  ctx.closePath()
  ctx.fill()

  ctx.fillRect(size * 0.45, size * 0.66, size * 0.1, size * 0.22)
  ctx.fillRect(size * 0.4, size * 0.86, size * 0.2, size * 0.06)

  const { data } = ctx.getImageData(0, 0, size, size)
  return { width: size, height: size, data }
}

export function registerTreeSdfIcon (map) {
  if (!map || map.hasImage(TREE_ICON_ID)) return
  const imageData = createTreeSdfImageData()
  if (!imageData) return
  map.addImage(TREE_ICON_ID, imageData, { sdf: true })
}
