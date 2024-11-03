export function nearestColor([r, g, b], colorNames) {
  let minDistSq = Infinity;
  let nearestColor = null;

  for (const color of colorNames) {
    const { rgb } = color;
    const distSq = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      nearestColor = color;
    }
  }

  return nearestColor;
}
