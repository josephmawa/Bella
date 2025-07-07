import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import { formats } from "./color-formats.js";
/** Consider binding color-format to displayed_format here */
import {
  D65,
  round,
  parseRGB,
  settings,
  XYZtoLMS,
  LMStoOKLab,
  multiplyMatrices,
} from "./utils.js";

import { colorNames } from "./color-names.js";
import { nearestColor } from "./nearest-color.js";

const moreProps = [
  { key: "id", blurb: "Unique color id" },
  { key: "srgb", blurb: "RGB in floating point format" },
  { key: "displayed_format", blurb: "Displayed color format" },
];
export const colorProps = [...formats, ...moreProps];
const Properties = {};

function getNick(key) {
  const nick = key.toUpperCase();
  if (!GObject.ParamSpec.is_valid_name(nick)) {
    throw new Error(`${nick} is an invalid property name`);
  }
  return nick;
}

for (const { key, blurb } of colorProps) {
  if (!GObject.ParamSpec.is_valid_name(key)) {
    throw new Error(`${key} is an invalid property name`);
  }
  Properties[key] = GObject.ParamSpec.string(
    key,
    getNick(key),
    blurb,
    GObject.ParamFlags.READWRITE,
    ""
  );
}

export const Color = GObject.registerClass(
  {
    GTypeName: "Color",
    Properties,
  },
  class Color extends GObject.Object {
    #floatRGB = [0.0, 0.0, 0.0];
    #precision = 0;
    constructor({ id, srgb } = {}) {
      super();

      if (!srgb) {
        srgb = [0.0, 0.0, 0.0];
      }
      if (!id) {
        id = GLib.uuid_string_random();
      }
      this.id = id;
      this.srgb = srgb;

      this.#floatRGB = Array.isArray(srgb) ? srgb : parseRGB(srgb);
      this.#precision = settings.get_int("precision");

      this.calculateFormats();

      settings.connect("changed::precision", this.updatePrecision);
      settings.connect("changed::color-format", this.updateColorFormat);
    }

    /** Consider debouncing this method */
    calculateFormats = () => {
      this.calcHex();
      this.calcRGB();
      this.calcHSV();
      this.calcHsl();
      this.calcHwb();
      this.calcXYZ();
      this.calcSRGB();
      this.calcCYMK();
      /** This should be called last */
      this.updateColorFormat();
    };

    calcSRGB = () => {
      this.srgb = this.#floatRGB.join(",");
    };

    calcHex = () => {
      const hex = this.#floatRGB.map((num) => {
        const rounded = round(num * 255);
        return rounded.toString(16).padStart(2, "0");
      });
      this.hex = `#${hex.join("")}`;
    };

    calcRGB = () => {
      const rgb = [];
      const rgbPercent = [];

      for (const num of this.#floatRGB) {
        rgb.push(round(num * 255, this.#precision));
        rgbPercent.push(round(num * 100, this.#precision));
      }

      this.rgb = `rgb(${rgb.join(", ")})`;
      this.rgb_percent = `rgb(${rgbPercent.join("%, ")}%)`;

      this.getName(rgb);
    };

    getName = (rgb) => {
      this.name = nearestColor(rgb, colorNames)?.name ?? "Unknown";
    };

    calcHSV = () => {
      let [h, s, v] = Gtk.rgb_to_hsv(...this.#floatRGB);

      h = round(h * 360, this.#precision);
      s = round(s * 100, this.#precision);
      v = round(v * 100, this.#precision);

      this.hsv = `hsv(${h}, ${s}%, ${v}%)`;
    };

    calcHsl = () => {
      const [r, g, b] = this.#floatRGB;
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

      h = round(h * 360, this.#precision);
      s = round(s * 100, this.#precision);
      l = round(l * 100, this.#precision);

      this.hsl = `hsl(${h}, ${s}%, ${l}%)`;
    };

    calcCYMK = () => {
      const [red, green, blue] = this.#floatRGB;
      const key = 1 - Math.max(red, green, blue);

      if (key === 1) {
        return [0, 0, 0, 100];
      }

      const cyan = (1 - red - key) / (1 - key);
      const magenta = (1 - green - key) / (1 - key);
      const yellow = (1 - blue - key) / (1 - key);

      const cmyk = [
        round(cyan * 100, this.#precision),
        round(magenta * 100, this.#precision),
        round(yellow * 100, this.#precision),
        round(key * 100, this.#precision),
      ];

      this.cmyk = `cmyk(${cmyk.join("%, ")}%)`;
    };

    calcHwb = () => {
      const [red, green, blue] = this.#floatRGB;

      const minimum = Math.min(...this.#floatRGB);
      const maximum = Math.max(...this.#floatRGB);
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
        throw new Error("Failed to convert to Hwb format");
      }

      const whiteness = minimum;
      const blackness = 1 - maximum;
      const hwb = [
        Math.round(hue, this.#precision),
        Math.round(whiteness * 100, this.#precision),
        Math.round(blackness * 100, this.#precision),
      ];

      this.hwb = `hwb(${hwb[0]}, ${hwb[1]}%, ${hwb[2]}%)`;
    };

    calcXYZ = () => {
      const [red, green, blue] = this.#floatRGB.map((color) => {
        if (color > 0.04045) {
          return Math.pow((color + 0.055) / 1.055, 2.4);
        }

        return color / 12.92;
      });

      const X = 0.4124 * red + 0.3576 * green + 0.1805 * blue;
      const Y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const Z = 0.0193 * red + 0.1192 * green + 0.9505 * blue;

      const XYZ = [X, Y, Z].map((value) => round(value * 100, this.#precision));
      this.xyz = `XYZ(${XYZ.join(", ")})`;

      this.calcLab([X, Y, Z]);
      this.calcOKLAB([X, Y, Z]);
    };

    calcLab = (xyz) => {
      const [x, y, z] = xyz.map((value, index) => {
        const val = (value * 100) / D65[index];
        return val > 0.008856 ? Math.pow(val, 1 / 3) : val * 7.787 + 16 / 116;
      });

      const l = 116 * y - 16;
      const a = 500 * (x - y);
      const b = 200 * (y - z);

      const lab = [l, a, b].map((value) => round(value, this.#precision));
      this.lab = `lab(${lab.join(", ")})`;
      this.calcLCH(l, a, b);
    };

    calcLCH = (l, a, b) => {
      const c = Math.sqrt(a * a + b * b);
      let h = (Math.atan2(b, a) * 180) / Math.PI;

      if (h < 0) h += 360;
      const lch = [l, c, h].map((value) => round(value, this.#precision));
      this.lch = `lch(${lch.join(", ")})`;
    };

    calcOKLAB = (XYZ) => {
      const LMS = multiplyMatrices(XYZtoLMS, XYZ);

      const OKLab = multiplyMatrices(LMStoOKLab, [
        Math.cbrt(LMS[0]),
        Math.cbrt(LMS[1]),
        Math.cbrt(LMS[2]),
      ]);

      const clone = [...OKLab];

      clone[0] = clone[0] * 100;
      const [l, ...ab] = clone.map((value) => round(value, this.#precision));
      this.oklab = `oklab(${l}% ${ab.join(" ")})`;

      this.calcOKLCH([...OKLab]);
    };

    calcOKLCH = (OKLab) => {
      const hue = (Math.atan2(OKLab[2], OKLab[1]) * 180) / Math.PI;
      const OKLCH = [
        OKLab[0],
        Math.sqrt(OKLab[1] ** 2 + OKLab[2] ** 2),
        hue >= 0 ? hue : hue + 360,
      ];

      OKLCH[0] = OKLCH[0] * 100;
      const [l, ...ch] = OKLCH.map((value) => round(value, this.#precision));
      this.oklch = `oklch(${l}% ${ch.join(" ")})`;
    };

    updateColorFormat = () => {
      this.displayed_format = this[settings.get_string("color-format")];
    };

    updateColor = (srgb) => {
      this.#floatRGB = Array.isArray(srgb) ? srgb : parseRGB(srgb);
      this.calculateFormats();
      return true;
    };

    updatePrecision = () => {
      this.#precision = settings.get_int("precision");
      this.calculateFormats();
    };

    static copyProperties(source, destination) {
      for (const { key } of colorProps) {
        destination[key] = source[key];
      }
      return true;
    }
  }
);
