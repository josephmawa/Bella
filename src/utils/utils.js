import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import { colorNames } from "./color-names.js";
import { nearestColor } from "./nearest-color.js";

export const settings = Gio.Settings.new(pkg.name);

export function parseRGB(rgb = "") {
  if (!rgb || !rgb.includes(",")) {
    return [0.0, 0.0, 0.0];
  }
  return rgb.split(",").map((c) => +c);
}

export function getColor(scaledRgb) {
  const rgb = [],
    hex = [],
    rgbPercent = [];

  for (const value of scaledRgb) {
    rgb.push(round(value * 255));
    hex.push(
      round(value * 255)
        .toString(16)
        .padStart(2, "0")
    );
    rgbPercent.push(`${round(value * 100)}%`);
  }

  const hsl = rgbToHsl(scaledRgb);
  const hsv = Gtk.rgb_to_hsv(...scaledRgb);
  const name = nearestColor(rgb, colorNames);
  const cmyk = rgbToCmyk(scaledRgb);
  const hwb = rgbToHwb(scaledRgb);

  const XYZ = rgbToXYZ(scaledRgb);
  const okLab = XYZToOKLab(XYZ);
  const okLch = OKLabToOKLCH(okLab);
  const lab = xyzToLab(XYZ.map((value) => value * 100));
  const lch = labToLch(lab);

  okLab[0] = okLab[0] * 100;

  const xyzRounded = XYZ.map((value) => round(value * 100));
  const labRounded = lab.map((value) => round(value));
  const lchRounded = lch.map((value) => round(value));
  const okLabRounded = okLab.map((value) => round(value));
  const okLchRounded = okLch.map((value) => round(value));

  return {
    id: GLib.uuid_string_random(),
    name: name?.name ?? "Unknown",
    hex: `#${hex.join("")}`,
    rgb: `rgb(${rgb.join(", ")})`,
    srgb: scaledRgb.join(","),
    hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
    hsv: getHsv(hsv),
    rgb_percent: `rgb(${rgbPercent.join(", ")})`,
    cmyk: `cmyk(${cmyk.join("%, ")}%)`,
    hwb: `hwb(${hwb[0]}, ${hwb[1]}%, ${hwb[2]}%)`,
    xyz: `XYZ(${xyzRounded.join(", ")})`,
    lab: `lab(${labRounded.join(", ")})`,
    lch: `lch(${lchRounded.join(", ")})`,
    oklab: `oklab(${okLabRounded[0]}% ${okLabRounded.slice(1).join(" ")})`,
    oklch: `oklch(${okLchRounded[0]}% ${okLchRounded.slice(1).join(" ")})`,
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
// RGB should be normalized/scaled in the range 0-1
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

  // READ MORE: https://stackoverflow.com/questions/588004/is-floating-point-math-broken
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
      `${maximum} isn't equal to any of ${normalizedRgb.join(",")}`
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
// Source: https://stackoverflow.com/questions/15408522/rgb-to-xyz-and-lab-colours-conversion
function rgbToXYZ(normalizedRgb) {
  const [red, green, blue] = normalizedRgb.map((color) => {
    if (color > 0.04045) {
      return Math.pow((color + 0.055) / 1.055, 2.4);
    }

    return color / 12.92;
  });

  const X = 0.4124 * red + 0.3576 * green + 0.1805 * blue;
  const Y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const Z = 0.0193 * red + 0.1192 * green + 0.9505 * blue;

  return [X, Y, Z];
}

export const D65 = [95.047, 100, 108.883];
function xyzToLab(xyz) {
  const [x, y, z] = xyz.map((value, index) => {
    const val = value / D65[index];
    return val > 0.008856 ? Math.pow(val, 1 / 3) : val * 7.787 + 16 / 116;
  });

  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);

  return [l, a, b];
}

function labToLch(lab) {
  const [l, a, b] = lab;

  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;

  if (h < 0) h += 360;

  return [l, c, h];
}

/**
 * Source: https://github.com/csstools/postcss-plugins/blob/main/packages/color-helpers/src/conversions/xyz-to-oklab.ts
 */

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

export function multiplyMatrices(a, b) {
  return [
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    a[3] * b[0] + a[4] * b[1] + a[5] * b[2],
    a[6] * b[0] + a[7] * b[1] + a[8] * b[2],
  ];
}

function XYZToOKLab(XYZ) {
  const LMS = multiplyMatrices(XYZtoLMS, XYZ);

  return multiplyMatrices(LMStoOKLab, [
    Math.cbrt(LMS[0]),
    Math.cbrt(LMS[1]),
    Math.cbrt(LMS[2]),
  ]);
}

/**
 * Source: https://github.com/csstools/postcss-plugins/blob/main/packages/color-helpers/src/conversions/oklab-to-oklch.ts
 */

function OKLabToOKLCH(OKLab) {
  const hue = (Math.atan2(OKLab[2], OKLab[1]) * 180) / Math.PI;
  return [
    OKLab[0],
    Math.sqrt(OKLab[1] ** 2 + OKLab[2] ** 2),
    hue >= 0 ? hue : hue + 360,
  ];
}
