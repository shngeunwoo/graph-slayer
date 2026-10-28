import type { AugmentId, Course, Shape, SlashResult } from "./types";

export type Augment = {
  id: AugmentId;
  course: Course;
  unit: string;
  name: string;
  glyph: string;
  effect: string;
};

export const AUGMENTS: Augment[] = [
  {
    id: "factor",
    course: "공통수학 1",
    unit: "다항식",
    name: "인수분해",
    glyph: "(x−a)",
    effect: "맞춘 약점 하나마다 피해가 14% 늘어난다.",
  },
  {
    id: "discriminant",
    course: "공통수학 1",
    unit: "방정식",
    name: "판별식",
    glyph: "D>0",
    effect: "모양이 75% 이상이면 피해 +18. 빗나가면 거의 안 늘어난다.",
  },
  {
    id: "inequality",
    course: "공통수학 1",
    unit: "부등식",
    name: "부등식의 영역",
    glyph: "≤",
    effect: "곡선을 길게 덮을수록 피해가 더 붙는다.",
  },
  {
    id: "permutation",
    course: "공통수학 1",
    unit: "경우의 수",
    name: "순열",
    glyph: "nPr",
    effect: "약점 점이 많을수록 조합처럼 피해가 뛴다.",
  },
  {
    id: "matrix",
    course: "공통수학 1",
    unit: "행렬",
    name: "변환 행렬",
    glyph: "AB",
    effect: "대칭·평행이동을 쓸 때마다 피해가 22% 늘어난다.",
  },
  {
    id: "line",
    course: "공통수학 2",
    unit: "도형의 방정식",
    name: "직선의 방정식",
    glyph: "ax+b",
    effect: "직선 약점을 벨 때 피해 1.3배.",
  },
  {
    id: "circle",
    course: "공통수학 2",
    unit: "도형의 방정식",
    name: "원의 방정식",
    glyph: "x²+y²",
    effect: "원 위의 약점을 벨 때 피해 1.4배.",
  },
  {
    id: "symmetry",
    course: "공통수학 2",
    unit: "도형의 방정식",
    name: "대칭이동",
    glyph: "↕",
    effect: "x축·y축·원점 대칭을 쓴 뒤의 베기가 1.35배.",
  },
  {
    id: "inverse",
    course: "공통수학 2",
    unit: "함수",
    name: "역함수",
    glyph: "y=x",
    effect: "y=x 대칭을 쓴 베기가 1.5배.",
  },
  {
    id: "proposition",
    course: "공통수학 2",
    unit: "집합과 명제",
    name: "참인 명제",
    glyph: "∀",
    effect: "빗나간 점이 하나도 없으면 패널티가 사라지고 피해가 15% 늘어난다.",
  },
];

export function rollOffers(owned: AugmentId[]): Augment[] {
  const pool = AUGMENTS.filter((a) => !owned.includes(a.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 3);
}

export function augmentById(id: AugmentId) {
  return AUGMENTS.find((a) => a.id === id)!;
}

export function comboMultiplier(combo: number) {
  if (combo < 2) return 1;
  return 1 + (combo - 1) * 0.15;
}

export function applyAugments(
  result: SlashResult,
  ids: AugmentId[],
  ctx: {
    validMarks: number;
    trapCount: number;
    transformCount: number;
    hasAxisReflect: boolean;
    hasYX: boolean;
    shape: Shape;
    baseDamage: number;
    coverage: number;
    combo: number;
  }
): SlashResult {
  let damage = result.damage;
  let selfDamage = result.selfDamage;
  for (const id of ids) {
    if (id === "factor") damage *= 1 + ctx.validMarks * 0.14;
    if (id === "discriminant" && result.accuracy >= 0.75) damage += 18;
    if (id === "inequality") damage *= 1 + ctx.coverage * 0.4;
    if (id === "permutation") damage *= 1 + ctx.validMarks * Math.max(0, ctx.validMarks - 1) * 0.05;
    if (id === "matrix") damage *= 1 + ctx.transformCount * 0.22;
    if (id === "line" && ctx.shape === "line") damage *= 1.3;
    if (id === "circle" && ctx.shape === "circle") damage *= 1.4;
    if (id === "symmetry" && ctx.hasAxisReflect) damage *= 1.35;
    if (id === "inverse" && ctx.hasYX) damage *= 1.5;
    if (id === "proposition" && ctx.trapCount === 0) {
      damage *= 1.15;
      selfDamage = 0;
    }
  }
  if (result.grade === "MISS") damage = Math.min(damage, ctx.baseDamage * 0.34);
  damage = Math.min(ctx.baseDamage * 3.6, Math.max(1, damage));
  if (result.grade !== "MISS") damage *= comboMultiplier(ctx.combo);
  damage = Math.round(Math.min(ctx.baseDamage * 5, Math.max(1, damage)));
  selfDamage = Math.round(selfDamage);
  return { ...result, damage, selfDamage };
}
