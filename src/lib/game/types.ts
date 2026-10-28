export type Point = { x: number; y: number };

export type GraphFn = (x: number) => number;

export type Course = "공통수학 1" | "공통수학 2";
export type Shape = "line" | "parabola" | "v" | "wave" | "circle";

export type Enemy = {
  id: string;
  name: string;
  title: string;
  course: Course;
  unit: string;
  shape: Shape;
  maxHp: number;
  baseDamage: number;
  equation: string;
  hint: string;
  fn: GraphFn;
  domain: [number, number];
  range: [number, number];
  color: string;
  silhouette: "slime" | "knight" | "wolf" | "mage" | "dragon";
  requireTransform: boolean;
  minMarks: number;
  radius?: number;
};

export type Phase = "title" | "augment" | "mark" | "draw" | "slash" | "victory" | "defeat";

export type AugmentId =
  | "factor"
  | "discriminant"
  | "inequality"
  | "permutation"
  | "matrix"
  | "line"
  | "circle"
  | "symmetry"
  | "inverse"
  | "proposition";

export type MarkedPoint = Point & { id: string; valid: boolean };

export type SlashGrade = "MISS" | "HIT" | "CRITICAL" | "PERFECT";

export type SlashResult = {
  accuracy: number;
  coverage: number;
  damage: number;
  grade: SlashGrade;
  trapRatio: number;
  selfDamage: number;
  validMarks: number;
};

export type Transform =
  | { kind: "reflectX" }
  | { kind: "reflectY" }
  | { kind: "reflectOrigin" }
  | { kind: "reflectYX" }
  | { kind: "translate"; h: number; k: number };

export type ItemId = "translate" | "reflectX" | "reflectY" | "reflectOrigin" | "reflectYX";

export type ViewBox = {
  domain: [number, number];
  range: [number, number];
};

export type Inventory = Record<ItemId, number>;
