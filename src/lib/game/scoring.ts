import { distToCurve } from "./graph";
import type { MarkedPoint, Point, SlashResult } from "./types";

export type StrokeRead = {
  accuracy: number;
  coverage: number;
  trapRatio: number;
  markTouch: number;
  heat: number;
  ready: boolean;
};

const EMPTY_READ: StrokeRead = {
  accuracy: 0,
  coverage: 0,
  trapRatio: 0,
  markTouch: 0,
  heat: 0,
  ready: false,
};

export function assessStroke(curve: Point[], stroke: Point[], marked: MarkedPoint[]): StrokeRead {
  if (stroke.length < 8 || curve.length < 2) return EMPTY_READ;

  const wrong = marked.filter((m) => !m.valid);
  const valids = marked.filter((m) => m.valid);
  let errSum = 0;
  let compared = 0;
  let trapHits = 0;
  let hot = 0;
  const hitIdx: number[] = [];

  for (const p of stroke) {
    const d = distToCurve(curve, p);
    errSum += Math.min(d, 1.4);
    compared += 1;
    if (d < 0.45) hot += 1;
    const onCurve = d < 0.36;
    if (onCurve) {
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < curve.length; i++) {
        const dd = Math.hypot(curve[i].x - p.x, curve[i].y - p.y);
        if (dd < best) {
          best = dd;
          nearest = i;
        }
      }
      hitIdx.push(nearest);
    }
    let nearWrong = false;
    for (const w of wrong) {
      if (Math.hypot(p.x - w.x, p.y - w.y) < 0.42) {
        nearWrong = true;
        break;
      }
    }
    if (nearWrong && !onCurve) trapHits += 1;
  }

  if (compared < 10) return { ...EMPTY_READ, trapRatio: trapHits / Math.max(1, stroke.length) };

  const meanErr = errSum / compared;
  const fidelity = Math.max(0, 1 - meanErr / 0.55);
  hitIdx.sort((a, b) => a - b);
  const span = hitIdx.length ? (hitIdx[hitIdx.length - 1] - hitIdx[0]) / (curve.length - 1) : 0;
  const coverage = Math.min(1, span / 0.82);
  const markBonus = Math.min(0.1, valids.length * 0.025);
  let touched = 0;
  for (const m of valids) {
    for (const p of stroke) {
      if (Math.hypot(p.x - m.x, p.y - m.y) < 0.45) {
        touched += 1;
        break;
      }
    }
  }
  const markTouch = valids.length ? touched / valids.length : 0;
  let accuracy = Math.min(1, fidelity * 0.78 + coverage * 0.22 + markBonus + markTouch * 0.06);
  const trapRatio = trapHits / compared;
  accuracy *= 1 - trapRatio * 0.85;

  return {
    accuracy: Math.max(0, Math.min(1, accuracy)),
    coverage,
    trapRatio,
    markTouch,
    heat: hot / compared,
    ready: true,
  };
}

export function scoreSlash(
  curve: Point[],
  stroke: Point[],
  marked: MarkedPoint[],
  baseDamage: number,
  transformCount: number,
  requireTransform: boolean
): SlashResult {
  const validMarks = marked.filter((m) => m.valid).length;
  const read = assessStroke(curve, stroke, marked);
  const empty: SlashResult = {
    accuracy: 0,
    coverage: 0,
    damage: Math.max(1, Math.floor(baseDamage * 0.08)),
    grade: "MISS",
    trapRatio: read.trapRatio,
    selfDamage: 4,
    validMarks,
  };
  if (!read.ready) return empty;

  const { accuracy, coverage, trapRatio } = read;
  const transformBonus = 1 + Math.min(0.55, transformCount * 0.18);
  const locked = requireTransform && transformCount === 0 ? 0.32 : 1;
  const mult = 0.12 + accuracy * 0.9;
  let damage = Math.max(0, Math.round(baseDamage * mult * transformBonus * locked * (1 - trapRatio * 0.75)));
  const selfDamage = trapRatio > 0.1 ? Math.round(8 + trapRatio * 22) : 0;

  let grade: SlashResult["grade"] = "HIT";
  if (accuracy < 0.38 || trapRatio > 0.55) grade = "MISS";
  else if (trapRatio > 0.32) grade = "HIT";
  else if (accuracy >= 0.9 && coverage >= 0.75) grade = "PERFECT";
  else if (accuracy >= 0.7) grade = "CRITICAL";

  if (grade === "MISS") damage = Math.min(damage, Math.round(baseDamage * 0.16 * locked));

  return { accuracy, coverage, damage, grade, trapRatio, selfDamage, validMarks };
}

export function mathToCanvas(
  p: Point,
  width: number,
  height: number,
  domain: [number, number],
  range: [number, number],
  pad = 40
): Point {
  const [xmin, xmax] = domain;
  const [ymin, ymax] = range;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  return {
    x: pad + ((p.x - xmin) / (xmax - xmin)) * iw,
    y: pad + ((ymax - p.y) / (ymax - ymin)) * ih,
  };
}

export function canvasToMath(
  p: Point,
  width: number,
  height: number,
  domain: [number, number],
  range: [number, number],
  pad = 40
): Point {
  const [xmin, xmax] = domain;
  const [ymin, ymax] = range;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  return {
    x: xmin + ((p.x - pad) / iw) * (xmax - xmin),
    y: ymax - ((p.y - pad) / ih) * (ymax - ymin),
  };
}
