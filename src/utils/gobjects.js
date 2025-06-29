import GObject from "gi://GObject";
import { formats } from "./formats.js";
import { settings } from "./utils.js";

const moreProps = [
  { key: "id", blurb: "Unique color id" },
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
    constructor(pickedColor = {}) {
      super();
      for (const { key } of colorProps) {
        if (Object.hasOwn(pickedColor, key)) {
          this[key] = pickedColor[key];
        }
      }
    }

    static copyProperties(source, destination) {
      for (const { key } of colorProps) {
        destination[key] = source[key];
      }
      return true;
    }
  }
);
