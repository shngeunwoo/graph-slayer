import type { Enemy, Point, Transform, ViewBox } from "./types";

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function sampleBase(enemy: Enemy, steps = 180): Point[] {
  if (enemy.shape === "circle") {
    const r = enemy.radius ?? 2;
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      pts.push({ x: round(r * Math.cos(t)), y: round(r * Math.sin(t)) });
    }
    return pts;
  }
  const [a, b] = enemy.domain;
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = a + ((b - a) * i) / steps;
    pts.push({ x: round(x), y: round(enemy.fn(x)) });
  }
  return pts;
}

export function applyTransform(pts: Point[], t: Transform): Point[] {
  return pts.map((p) => {
    if (t.kind === "reflectX") return { x: p.x, y: -p.y };
    if (t.kind === "reflectY") return { x: -p.x, y: p.y };
    if (t.kind === "reflectOrigin") return { x: -p.x, y: -p.y };
    if (t.kind === "reflectYX") return { x: p.y, y: p.x };
    return { x: p.x + t.h, y: p.y + t.k };
  });
}

export function applyStack(pts: Point[], stack: Transform[]): Point[] {
  return stack.reduce((acc, t) => applyTransform(acc, t), pts);
}

export function viewFor(pts: Point[], fallback: ViewBox): ViewBox {
  if (!pts.length) return fallback;
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (const p of pts) {
    xmin = Math.min(xmin, p.x);
    xmax = Math.max(xmax, p.x);
    ymin = Math.min(ymin, p.y);
    ymax = Math.max(ymax, p.y);
  }
  const pad = 0.85;
  xmin -= pad;
  xmax += pad;
  ymin -= pad;
  ymax += pad;
  xmin = Math.min(xmin, -0.6);
  xmax = Math.max(xmax, 0.6);
  ymin = Math.min(ymin, -0.6);
  ymax = Math.max(ymax, 0.6);
  const minSpan = 8;
  if (xmax - xmin < minSpan) {
    const m = (xmin + xmax) / 2;
    xmin = m - minSpan / 2;
    xmax = m + minSpan / 2;
  }
  if (ymax - ymin < minSpan) {
    const m = (ymin + ymax) / 2;
    ymin = m - minSpan / 2;
    ymax = m + minSpan / 2;
  }
  return {
    domain: [Math.floor(xmin), Math.ceil(xmax)],
    range: [Math.floor(ymin), Math.ceil(ymax)],
  };
}

function distToSegment(a: Point, b: Point, p: Point) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

export function distToCurve(curve: Point[], p: Point) {
  let best = Infinity;
  for (let i = 0; i < curve.length - 1; i++) {
    best = Math.min(best, distToSegment(curve[i], curve[i + 1], p));
  }
  return best;
}

export function closestOnCurve(curve: Point[], p: Point): Point {
  let best = curve[0] ?? p;
  let bestD = Infinity;
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
    const q = { x: a.x + t * vx, y: a.y + t * vy };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

export const ON_CURVE_TOL = 0.28;

export function classifyAgainst(
  curve: Point[],
  x: number,
  y: number
): { x: number; y: number; valid: boolean } {
  const snappedX = Math.round(x * 100) / 100;
  const snappedY = Math.round(y * 100) / 100;
  const p = { x: snappedX, y: snappedY };
  const d = distToCurve(curve, p);
  if (d <= ON_CURVE_TOL) {
    const q = closestOnCurve(curve, p);
    return {
      x: Math.round(q.x * 100) / 100,
      y: Math.round(q.y * 100) / 100,
      valid: true,
    };
  }
  return { x: snappedX, y: snappedY, valid: false };
}

export function transformLabel(t: Transform) {
  if (t.kind === "reflectX") return "x축 대칭";
  if (t.kind === "reflectY") return "y축 대칭";
  if (t.kind === "reflectOrigin") return "원점 대칭";
  if (t.kind === "reflectYX") return "y = x 대칭";
  return `평행이동 (${t.h}, ${t.k})`;
}

export function describeGraph(baseEquation: string, stack: Transform[]) {
  if (!stack.length) return baseEquation;
  return `${baseEquation} → ${stack.map(transformLabel).join(" → ")}`;
}
