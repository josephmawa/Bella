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
  const name = nearestColor(rgb, colorNames);
  const cmyk = rgbToCmyk(scaledRgb);
  const hwb = rgbToHwb(scaledRgb);

  return {
    name: name?.name ?? "Unknown",
    hex: `#${hex.join("").toUpperCase()}`,
    rgb: `rgb(${rgb.join(", ")})`,
    hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
    rgb_percent: `rgb(${rgb_percent.join(", ")})`,
    cmyk: `cmyk(${cmyk.join("%, ")}%)`,
    hwb: `hwb(${hwb[0]}, ${hwb[1]}%, ${hwb[2]}%)`,
  };
}

export function getHsv([hue, saturation, value]) {
  const scaledHue = round(hue * 360);
  const scaledSaturation = round(saturation * 100);
  const scaledValue = round(value * 100);

  return `hsv(${scaledHue}, ${scaledSaturation}%, ${scaledValue}%)`;
}

// https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
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

// This formula is from https://www.codeproject.com/KB/applications/xcmyk.aspx
// RGB should be normalized in the range 0-1
export function rgbToCmyk([red, green, blue]) {
  const key = 1 - Math.max(red, green, blue);

  if (key === 1) {
    return [0, 0, 0, 100];
  }

  const cyan = (1 - red - key) / (1 - key);
  const magenta = (1 - green - key) / (1 - key);
  const yellow = (1 - blue - key) / (1 - key);

  return [
    round(cyan * 100),
    round(magenta * 100),
    round(yellow * 100),
    round(key * 100),
  ];
}

function rgbToHwb(normalizedRgb) {
  const [red, green, blue] = normalizedRgb;

  const minimum = Math.min(...normalizedRgb);
  const maximum = Math.max(...normalizedRgb);
  const delta = maximum - minimum;

  let hue;

  // https://stackoverflow.com/questions/588004/is-floating-point-math-broken
  if (delta <= Number.EPSILON) {
    hue = 0;
  } else if (maximum === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (maximum === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else if (maximum === blue) {
    hue = 60 * ((red - green) / delta + 4);
  } else {
    throw new Error(
      `${maximum} isn't equal to any of ${normalizedRgb.join(",")} `
    );
  }

  const whiteness = minimum;
  const blackness = 1 - maximum;

  return [
    Math.round(hue),
    Math.round(whiteness * 100),
    Math.round(blackness * 100),
  ];
}
