import Gio from "gi://Gio";
export const settings = Gio.Settings.new(pkg.name);

export const D65 = [95.047, 100, 108.883];

export const XYZtoLMS = [
  0.819022437996703, 0.3619062600528904, -0.1288737815209879,
  0.0329836539323885, 0.9292868615863434, 0.0361446663506424,
  0.0481771893596242, 0.2642395317527308, 0.6335478284694309,
];

export const LMStoOKLab = [
  0.210454268309314, 0.7936177747023054, -0.0040720430116193,
  1.9779985324311684, -2.4285922420485799, 0.450593709617411,
  0.0259040424655478, 0.7827717124575296, -0.8086757549230774,
];

export function parseRGB(rgb = "") {
  if (!rgb || !rgb.includes(",")) {
    return [0.0, 0.0, 0.0];
  }
  return rgb.split(",").map((c) => +c);
}

export function round(num, dp = 0) {
  const multiple = Math.pow(10, dp);
  return Math.round(num * multiple) / multiple;
}

export function multiplyMatrices(a, b) {
  return [
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    a[3] * b[0] + a[4] * b[1] + a[5] * b[2],
    a[6] * b[0] + a[7] * b[1] + a[8] * b[2],
  ];
}

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
