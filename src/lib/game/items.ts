import type { ItemId } from "./types";

export const SHOP: {
  id: ItemId;
  name: string;
  cost: number;
  blurb: string;
}[] = [
  { id: "translate", name: "평행이동", cost: 12, blurb: "(x, y) → (x+h, y+k)" },
  { id: "reflectX", name: "x축 대칭", cost: 10, blurb: "(x, y) → (x, −y)" },
  { id: "reflectY", name: "y축 대칭", cost: 10, blurb: "(x, y) → (−x, y)" },
  { id: "reflectOrigin", name: "원점 대칭", cost: 14, blurb: "(x, y) → (−x, −y)" },
  { id: "reflectYX", name: "y = x 대칭", cost: 16, blurb: "(x, y) → (y, x)" },
];

export const EMPTY_BAG = {
  translate: 0,
  reflectX: 0,
  reflectY: 0,
  reflectOrigin: 0,
  reflectYX: 0,
};
