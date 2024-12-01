import { colorNames } from "./color-names.js";
import { nearestColor } from "./nearest-color.js";

export function getColor(scaledRgb) {
  const rgb = [],
    hex = [],
    rgb_percent = [];

  for (const value of scaledRgb) {
    rgb.push(round(value * 255));
    hex.push(
      round(value * 255)
        .toString(16)
        .padStart(2, "0")
    );
    rgb_percent.push(`${round(value * 100)}%`);
  }

  const hsl = rgbToHsl(scaledRgb);
  const _hex = `#${hex.join("").toUpperCase()}`;
  const name = nearestColor(rgb, colorNames);

  return {
    name: name?.name ?? "Unknown",
    hex: _hex,
    rgb: `rgb(${rgb.join(", ")})`,
    hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
    rgb_percent: `rgb(${rgb_percent.join(", ")})`,
  };
}

export function getHsv([hue, saturation, value]) {
  const scaledHue = round(hue * 360);
  const scaledSaturation = round(saturation * 100);
  const scaledValue = round(value * 100);

  return `hsv(${scaledHue}, ${scaledSaturation}%, ${scaledValue}%)`;
}

//https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
// https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
// FIXME - Make it readable
export function rgbToHsl([r, g, b]) {
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [round(h * 360), round(s * 100), round(l * 100)];
}

export function round(number, decimalPlaces = 0) {
  const multiple = Math.pow(10, decimalPlaces);
  return Math.round(number * multiple) / multiple;
}


export const colorFormats = [
  { key: "name", description: "Name" },
  { key: "hex", description: "Hex" },
  { key: "rgb", description: "RGB" },
  { key: "rgb_percent", description: "RGB Percent" },
  { key: "hsl", description: "HSL" },
  { key: "hsv", description: "HSV" },
];
