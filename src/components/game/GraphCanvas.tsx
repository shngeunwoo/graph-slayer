"use client";

import { useEffect, useRef } from "react";
import { distToCurve, ON_CURVE_TOL } from "@/lib/game/graph";
import { canvasToMath, mathToCanvas } from "@/lib/game/scoring";
import type { MarkedPoint, Point, ViewBox } from "@/lib/game/types";

type Props = {
  curve: Point[];
  view: ViewBox;
  color: string;
  marked: MarkedPoint[];
  stroke: Point[];
  onStrokeChange: (pts: Point[]) => void;
  onStrokeLive?: (pts: Point[]) => void;
  onDrawStart?: () => void;
  onPlacePoint: (p: Point) => void;
  onRemovePoint: (id: string) => void;
  mode: "mark" | "draw" | "slash";
  slashProgress?: number;
  slashKind?: "clean" | "trap";
  combo?: number;
};

type Hover = { math: Point; screen: Point };
type Ripple = { x: number; y: number; born: number; valid: boolean };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };

const PAD = 40;

export function GraphCanvas({
  curve,
  view,
  color,
  marked,
  stroke,
  onStrokeChange,
  onStrokeLive,
  onDrawStart,
  onPlacePoint,
  onRemovePoint,
  mode,
  slashProgress = 0,
  slashKind = "clean",
  combo = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const downPos = useRef<Point | null>(null);
  const strokeRef = useRef<Point[]>([]);
  const sizeRef = useRef({ w: 640, h: 420 });
  const hoverRef = useRef<Hover | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const trailRef = useRef<Point[]>([]);
  const liveRef = useRef(onStrokeLive);
  const startRef = useRef(onDrawStart);
  const lastLive = useRef(0);
  useEffect(() => {
    liveRef.current = onStrokeLive;
    startRef.current = onDrawStart;
  });
  const propsRef = useRef({ curve, view, color, marked, mode, slashProgress, slashKind, combo });

  useEffect(() => {
    if (drawing.current) return;
    strokeRef.current = stroke;
  }, [stroke]);

  useEffect(() => {
    propsRef.current = { curve, view, color, marked, mode, slashProgress, slashKind, combo };
  }, [curve, view, color, marked, mode, slashProgress, slashKind, combo]);

  const paint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const p = propsRef.current;
    drawScene(ctx, w, h, {
      ...p,
      stroke: strokeRef.current,
      hover: hoverRef.current,
      ripples: ripplesRef.current,
      sparks: sparksRef.current,
      trail: trailRef.current,
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(280, Math.floor(parent.clientWidth));
      const h = Math.max(300, Math.floor(Math.min(parent.clientWidth * 0.72, 480)));
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const c = canvas.getContext("2d");
      if (c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    paint();
  }, [curve, view, color, marked, stroke, mode, slashProgress, slashKind, combo]);

  useEffect(() => {
    if (mode !== "slash") {
      sparksRef.current = [];
      trailRef.current = [];
      return;
    }
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(32, now - last) / 16.6;
      last = now;
      const p = propsRef.current;
      const { w, h } = sizeRef.current;
      const path = toScreens(p.curve, w, h, p.view);
      const t = easeOut(p.slashProgress);
      const tip = along(path, t);
      if (tip && path.length > 1) {
        trailRef.current = [...trailRef.current.slice(-14), tip.pos];
        const ang = tip.ang;
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const kind = p.slashKind;
        for (let i = 0; i < 5; i++) {
          const spread = (Math.random() - 0.5) * 1.4;
          sparksRef.current.push({
            x: tip.pos.x,
            y: tip.pos.y,
            vx: nx * (3 + Math.random() * 7) + Math.cos(ang) * spread,
            vy: ny * (3 + Math.random() * 7) + Math.sin(ang) * spread - 0.6,
            life: 18 + Math.random() * 16,
            size: 1.2 + Math.random() * 2.4,
            color: kind === "trap" ? "#ffb199" : Math.random() > 0.4 ? "#fff6d0" : "#ffd27a",
          });
        }
      }
      sparksRef.current = sparksRef.current
        .map((s) => ({
          ...s,
          x: s.x + s.vx * dt,
          y: s.y + s.vy * dt,
          vy: s.vy + 0.18 * dt,
          life: s.life - dt,
        }))
        .filter((s) => s.life > 0)
        .slice(-180);
      paint();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [mode]);

  useEffect(() => {
    if (!ripplesRef.current.length) return;
    let id = 0;
    const loop = () => {
      const now = performance.now();
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.born < 500);
      paint();
      if (ripplesRef.current.length) id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [marked.length]);

  const posFromEvent = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const mathFromScreen = (screen: Point) => {
    const { w, h } = sizeRef.current;
    return canvasToMath(screen, w, h, view.domain, view.range, PAD);
  };

  const emitLive = (force = false) => {
    const now = performance.now();
    if (!force && now - lastLive.current < 70) return;
    lastLive.current = now;
    liveRef.current?.(strokeRef.current);
  };

  const extendStroke = (math: Point) => {
    const last = strokeRef.current.at(-1);
    if (!last) {
      strokeRef.current = [math];
      return;
    }
    const dist = Math.hypot(last.x - math.x, last.y - math.y);
    if (dist < 0.03) return;
    const steps = Math.max(1, Math.ceil(dist / 0.08));
    const next = strokeRef.current.slice();
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      next.push({ x: last.x + (math.x - last.x) * t, y: last.y + (math.y - last.y) * t });
    }
    strokeRef.current = next;
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처가 거절돼도 드래그는 이어진다 */
    }
    const screen = posFromEvent(e);
    downPos.current = screen;
    if (mode !== "draw") return;
    drawing.current = true;
    strokeRef.current = [mathFromScreen(screen)];
    startRef.current?.();
    emitLive(true);
    paint();
  };

  const onMove = (e: React.PointerEvent) => {
    const screen = posFromEvent(e);
    if (mode === "mark") {
      const math = mathFromScreen(screen);
      const near = marked.find((m) => Math.hypot(m.x - math.x, m.y - math.y) < 0.42);
      hoverRef.current = near ? null : { math, screen };
      paint();
      return;
    }
    if (!drawing.current || mode !== "draw") return;
    extendStroke(mathFromScreen(screen));
    emitLive();
    paint();
  };

  const onUp = (e: React.PointerEvent) => {
    const screen = posFromEvent(e);
    if (mode === "draw" && drawing.current) {
      extendStroke(mathFromScreen(screen));
      drawing.current = false;
      emitLive(true);
      onStrokeChange(strokeRef.current);
      downPos.current = null;
      paint();
      return;
    }
    if (mode === "mark" && downPos.current) {
      const dist = Math.hypot(screen.x - downPos.current.x, screen.y - downPos.current.y);
      if (dist < 14) {
        const math = mathFromScreen(screen);
        const hit = marked.find((m) => Math.hypot(m.x - math.x, m.y - math.y) < 0.42);
        if (hit) onRemovePoint(hit.id);
        else {
          const { w, h } = sizeRef.current;
          const snapped = mathToCanvas(math, w, h, view.domain, view.range, PAD);
          ripplesRef.current.push({
            x: snapped.x,
            y: snapped.y,
            born: performance.now(),
            valid: distToCurve(curve, math) <= ON_CURVE_TOL,
          });
          onPlacePoint(math);
        }
      }
    }
    drawing.current = false;
    downPos.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full touch-none ${mode === "slash" ? "cursor-default" : "cursor-crosshair"}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => {
        hoverRef.current = null;
        paint();
      }}
      aria-label="약점 그래프"
    />
  );
}

function easeOut(t: number) {
  return 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
}

function toScreens(curve: Point[], w: number, h: number, view: ViewBox) {
  return curve.map((p) => mathToCanvas(p, w, h, view.domain, view.range, PAD));
}

function along(path: Point[], t: number) {
  if (path.length < 2) return null;
  const idx = t * (path.length - 1);
  const i0 = Math.min(path.length - 2, Math.floor(idx));
  const u = idx - i0;
  const a = path[i0];
  const b = path[i0 + 1];
  return {
    pos: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u },
    ang: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: {
    curve: Point[];
    view: ViewBox;
    color: string;
    marked: MarkedPoint[];
    stroke: Point[];
    mode: Props["mode"];
    slashProgress: number;
    slashKind: "clean" | "trap";
    combo: number;
    hover: Hover | null;
    ripples: Ripple[];
    sparks: Spark[];
    trail: Point[];
  }
) {
  const { curve, view, color, marked, stroke, mode, slashProgress, slashKind, combo, hover, ripples, sparks, trail } =
    opts;
  const paper = ctx.createLinearGradient(0, 0, 0, h);
  paper.addColorStop(0, "#fffdf8");
  paper.addColorStop(1, "#f4ecdf");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h, view);

  if (mode !== "slash") {
    drawReveal(ctx, w, h, view, curve, marked, combo, mode, color);
  }

  if (stroke.length > 1 && mode === "mark") {
    drawPlayerStroke(ctx, w, h, view, stroke, 1, "#c45c3e");
  }
  if (stroke.length > 1 && mode === "draw") {
    drawHeatStroke(ctx, w, h, view, stroke, curve);
  }

  if (mode === "slash") {
    const t = easeOut(slashProgress);
    drawGash(ctx, w, h, view, curve, t, slashKind);
    if (stroke.length > 1) drawPlayerStroke(ctx, w, h, view, stroke, t, slashKind === "trap" ? "#a33b2c" : "#c45c3e88");
    drawImpactFlash(ctx, w, h, t);
    drawSparks(ctx, sparks);
    drawGhostTrail(ctx, trail, slashKind);
    const path = toScreens(curve, w, h, view);
    const tip = along(path, t);
    if (tip) drawKatana(ctx, tip.pos, tip.ang, slashKind);
  }

  for (const r of ripples) drawRipple(ctx, r);
  let n = 0;
  for (const m of marked) {
    if (m.valid) n += 1;
    drawMarkedPoint(ctx, w, h, view, m, m.valid ? n : 0);
  }
  if (hover && mode === "mark") drawHover(ctx, hover);
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, view: ViewBox) {
  const [xmin, xmax] = view.domain;
  const [ymin, ymax] = view.range;
  const xStep = xmax - xmin <= 10 ? 1 : 2;
  const yStep = ymax - ymin <= 10 ? 1 : 2;
  ctx.strokeStyle = "rgba(196,176,148,0.4)";
  ctx.lineWidth = 1;
  for (let x = Math.ceil(xmin / xStep) * xStep; x <= xmax + 1e-9; x += xStep) {
    const p = mathToCanvas({ x, y: 0 }, w, h, view.domain, view.range, PAD);
    ctx.beginPath();
    ctx.moveTo(p.x, PAD);
    ctx.lineTo(p.x, h - PAD);
    ctx.stroke();
  }
  for (let y = Math.ceil(ymin / yStep) * yStep; y <= ymax + 1e-9; y += yStep) {
    const p = mathToCanvas({ x: 0, y }, w, h, view.domain, view.range, PAD);
    ctx.beginPath();
    ctx.moveTo(PAD, p.y);
    ctx.lineTo(w - PAD, p.y);
    ctx.stroke();
  }
  const origin = mathToCanvas({ x: 0, y: 0 }, w, h, view.domain, view.range, PAD);
  ctx.strokeStyle = "#5f564a";
  ctx.lineWidth = 1.8;
  if (origin.x >= PAD && origin.x <= w - PAD) {
    ctx.beginPath();
    ctx.moveTo(origin.x, PAD);
    ctx.lineTo(origin.x, h - PAD);
    ctx.stroke();
  }
  if (origin.y >= PAD && origin.y <= h - PAD) {
    ctx.beginPath();
    ctx.moveTo(PAD, origin.y);
    ctx.lineTo(w - PAD, origin.y);
    ctx.stroke();
  }
  ctx.fillStyle = "#74685a";
  ctx.font = "12px ui-sans-serif, sans-serif";
  ctx.textAlign = "center";
  for (let x = Math.ceil(xmin / xStep) * xStep; x <= xmax + 1e-9; x += xStep) {
    if (Math.abs(x) < 1e-9) continue;
    const p = mathToCanvas({ x, y: 0 }, w, h, view.domain, view.range, PAD);
    ctx.fillText(String(x), p.x, Math.min(h - 12, origin.y + 16));
  }
  ctx.textAlign = "right";
  for (let y = Math.ceil(ymin / yStep) * yStep; y <= ymax + 1e-9; y += yStep) {
    if (Math.abs(y) < 1e-9) continue;
    const p = mathToCanvas({ x: 0, y }, w, h, view.domain, view.range, PAD);
    ctx.fillText(String(y), Math.max(PAD - 6, origin.x - 8), p.y + 4);
  }
}

function drawReveal(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ViewBox,
  curve: Point[],
  marked: MarkedPoint[],
  combo: number,
  mode: Props["mode"],
  color: string
) {
  const valids = marked.filter((m) => m.valid);
  if (!valids.length || combo <= 0) return;
  const radius = (mode === "draw" ? 0.72 : 0.58) + Math.min(combo, 5) * 0.12;
  const radius2 = radius * radius;
  const screens = toScreens(curve, w, h, view);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  let drawing = false;
  for (let i = 0; i < curve.length; i++) {
    const p = curve[i];
    let near = false;
    for (const m of valids) {
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      if (dx * dx + dy * dy <= radius2) {
        near = true;
        break;
      }
    }
    if (!near) {
      drawing = false;
      continue;
    }
    if (!drawing) {
      ctx.moveTo(screens[i].x, screens[i].y);
      drawing = true;
    } else ctx.lineTo(screens[i].x, screens[i].y);
  }
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#fffdf8";
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();
}

function drawHeatStroke(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ViewBox,
  stroke: Point[],
  curve: Point[]
) {
  const screens = toScreens(stroke, w, h, view);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < screens.length; i++) {
    const d = distToCurve(curve, stroke[i]);
    const hot = Math.max(0, 1 - d / 0.5);
    ctx.strokeStyle = hot > 0.45 ? "#e2b340" : hot > 0.2 ? "#c45c3e" : "#8a3a2c";
    ctx.lineWidth = 2.6 + hot * 3.4;
    ctx.globalAlpha = 0.72 + hot * 0.28;
    ctx.beginPath();
    ctx.moveTo(screens[i - 1].x, screens[i - 1].y);
    ctx.lineTo(screens[i].x, screens[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerStroke(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ViewBox,
  stroke: Point[],
  progress: number,
  color: string
) {
  const screens = toScreens(stroke, w, h, view);
  const count = Math.max(2, Math.floor(screens.length * progress));
  ctx.save();
  ctx.beginPath();
  screens.slice(0, count).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function drawGash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ViewBox,
  curve: Point[],
  t: number,
  kind: "clean" | "trap"
) {
  const screens = toScreens(curve, w, h, view);
  const count = Math.max(2, Math.floor(screens.length * t));
  const slice = screens.slice(0, count);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = kind === "trap" ? "rgba(255,80,40,0.8)" : "rgba(255,230,140,0.95)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  slice.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = kind === "trap" ? "#ff6a45" : "#fff4c8";
  ctx.lineWidth = 26;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = kind === "trap" ? "#c45c3e" : "#f2c14a";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#1a1410";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = "#fffdf6";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawImpactFlash(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  if (t < 0.02 || t > 0.22) return;
  const a = (1 - (t - 0.02) / 0.2) * 0.42;
  ctx.fillStyle = `rgba(255,248,230,${a})`;
  ctx.fillRect(0, 0, w, h);
}

function drawGhostTrail(ctx: CanvasRenderingContext2D, trail: Point[], kind: "clean" | "trap") {
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 1; i < trail.length; i++) {
    ctx.globalAlpha = (i / trail.length) * 0.55;
    ctx.strokeStyle = kind === "trap" ? "#ffd0c0" : "#fff6d8";
    ctx.lineWidth = 10 * (i / trail.length);
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawKatana(ctx: CanvasRenderingContext2D, tip: Point, ang: number, kind: "clean" | "trap") {
  const pulse = 22 + (Math.sin(performance.now() / 40) + 1) * 8;
  ctx.save();
  ctx.strokeStyle = kind === "trap" ? "rgba(255,120,80,0.55)" : "rgba(255,244,210,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, pulse, ang - 1.1, ang + 1.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, pulse * 0.55, ang - 0.7, ang + 0.7);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(ang);
  ctx.shadowColor = kind === "trap" ? "#ff7048" : "#ffe9a0";
  ctx.shadowBlur = 36;
  const blade = ctx.createLinearGradient(-150, 0, 36, 0);
  blade.addColorStop(0, "rgba(255,255,255,0)");
  blade.addColorStop(0.28, kind === "trap" ? "#c45c3e" : "#c5ced8");
  blade.addColorStop(0.62, "#fffdf8");
  blade.addColorStop(1, "#fff");
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(42, 0);
  ctx.lineTo(-6, 9);
  ctx.lineTo(-132, 3.2);
  ctx.lineTo(-142, 0);
  ctx.lineTo(-132, -3.2);
  ctx.lineTo(-6, -9);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#2a2118";
  ctx.fillRect(-28, -11, 12, 22);
  ctx.fillStyle = "#c44532";
  ctx.beginPath();
  ctx.moveTo(-22, -16);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-22, 16);
  ctx.lineTo(-30, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6a503c";
  ctx.fillRect(-128, -2.2, 96, 4.4);
  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[]) {
  for (const s of sparks) {
    ctx.globalAlpha = Math.min(1, s.life / 12);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRipple(ctx: CanvasRenderingContext2D, r: Ripple) {
  const t = Math.min(1, (performance.now() - r.born) / 500);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = r.valid ? "#2f8f7b" : "#c45c3e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r.x, r.y, 7 + t * 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMarkedPoint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  view: ViewBox,
  m: MarkedPoint,
  index: number
) {
  const s = mathToCanvas(m, w, h, view.domain, view.range, PAD);
  ctx.beginPath();
  ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
  ctx.fillStyle = m.valid ? "#2f8f7b" : "#c45c3e";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fffdf8";
  ctx.stroke();
  if (!m.valid) {
    ctx.beginPath();
    ctx.moveTo(s.x - 4, s.y - 4);
    ctx.lineTo(s.x + 4, s.y + 4);
    ctx.moveTo(s.x + 4, s.y - 4);
    ctx.lineTo(s.x - 4, s.y + 4);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fffdf8";
    ctx.font = "bold 11px ui-sans-serif, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index), s.x, s.y + 0.5);
  }
  const label = `(${fmt(m.x)}, ${fmt(m.y)})`;
  ctx.font = "12px ui-sans-serif, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(255,253,248,0.94)";
  ctx.fillRect(s.x + 11, s.y - 26, tw + 10, 18);
  ctx.fillStyle = m.valid ? "#3c342c" : "#8a3a2c";
  ctx.fillText(label, s.x + 16, s.y - 13);
}

function drawHover(ctx: CanvasRenderingContext2D, hover: Hover) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(hover.screen.x, hover.screen.y, 7, 0, Math.PI * 2);
  ctx.strokeStyle = "#5c5348";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.font = "12px ui-sans-serif, sans-serif";
  ctx.fillStyle = "#3c342c";
  ctx.textAlign = "left";
  ctx.fillText(`(${fmt(hover.math.x)}, ${fmt(hover.math.y)})`, hover.screen.x + 12, hover.screen.y - 10);
  ctx.restore();
}

function fmt(n: number) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

