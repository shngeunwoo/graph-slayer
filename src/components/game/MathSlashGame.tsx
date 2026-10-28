"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AugmentPicker } from "@/components/game/AugmentPicker";
import { EnemyPortrait } from "@/components/game/EnemyPortrait";
import { GameButton } from "@/components/game/GameButton";
import { GraphCanvas } from "@/components/game/GraphCanvas";
import { ItemShop } from "@/components/game/ItemShop";
import { SlashFlash } from "@/components/game/SlashFlash";
import { applyAugments, augmentById, comboMultiplier, rollOffers } from "@/lib/game/augments";
import { ENEMIES } from "@/lib/game/enemies";
import {
  applyStack,
  classifyAgainst,
  describeGraph,
  sampleBase,
  transformLabel,
  viewFor,
} from "@/lib/game/graph";
import { EMPTY_BAG, SHOP } from "@/lib/game/items";
import { assessStroke, scoreSlash } from "@/lib/game/scoring";
import { playMark, playSlash, playTone } from "@/lib/game/sfx";
import type {
  AugmentId,
  Inventory,
  ItemId,
  MarkedPoint,
  Phase,
  Point,
  SlashResult,
  Transform,
} from "@/lib/game/types";

type Floater = { id: string; text: string; kind: "hit" | "hurt" | "combo" };

export function MathSlashGame() {
  const [phase, setPhase] = useState<Phase>("title");
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [hp, setHp] = useState(ENEMIES[0].maxHp);
  const [playerHp, setPlayerHp] = useState(100);
  const [gold, setGold] = useState(24);
  const [bag, setBag] = useState<Inventory>({ ...EMPTY_BAG });
  const [stack, setStack] = useState<Transform[]>([]);
  const [marked, setMarked] = useState<MarkedPoint[]>([]);
  const [stroke, setStroke] = useState<Point[]>([]);
  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [slashProgress, setSlashProgress] = useState(0);
  const [lastScore, setLastScore] = useState<SlashResult | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [turns, setTurns] = useState(0);
  const [owned, setOwned] = useState<AugmentId[]>([]);
  const [offers, setOffers] = useState<AugmentId[]>([]);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [dx, setDx] = useState("1");
  const [dy, setDy] = useState("0");
  const [callout, setCallout] = useState<Floater | null>(null);
  const xField = useRef<HTMLInputElement>(null);
  const [liveStroke, setLiveStroke] = useState<Point[]>([]);
  const [report, setReport] = useState("");

  const enemy = ENEMIES[enemyIndex];
  const baseCurve = useMemo(() => sampleBase(enemy), [enemy]);
  const curve = useMemo(() => applyStack(baseCurve, stack), [baseCurve, stack]);
  const view = useMemo(
    () => viewFor(curve, { domain: enemy.domain, range: enemy.range }),
    [curve, enemy]
  );
  const validCount = marked.filter((m) => m.valid).length;
  const trapCount = marked.filter((m) => !m.valid).length;
  const combo = trapCount > 0 ? 0 : validCount;
  const comboRate = comboMultiplier(combo);
  const equation = describeGraph(enemy.equation, stack);
  const activeStroke = liveStroke.length ? liveStroke : stroke;
  const preview = useMemo(
    () => assessStroke(curve, activeStroke, marked),
    [curve, activeStroke, marked]
  );

  useEffect(() => {
    if (!callout) return;
    const t = window.setTimeout(() => setCallout(null), 780);
    return () => window.clearTimeout(t);
  }, [callout]);

  const resetBattle = useCallback((index: number) => {
    setEnemyIndex(index);
    setHp(ENEMIES[index].maxHp);
    setMarked([]);
    setStroke([]);
    setStack([]);
    setXInput("");
    setYInput("");
    setFeedback(
      ENEMIES[index].requireTransform
        ? "이 상대는 변환한 그래프만 제대로 베입니다. 아이템을 사세요."
        : "식만 보고 좌표를 찍으세요. 곡선은 베기 전에는 안 보입니다."
    );
    setSlashProgress(0);
    setLastScore(null);
    setFloaters([]);
    setLiveStroke([]);
    setReport("");
    setTranslateOpen(false);
    setPhase("mark");
  }, []);

  const openAugment = (nextIndex: number, have: AugmentId[]) => {
    const next = rollOffers(have);
    if (next.length === 0) {
      resetBattle(nextIndex);
      return;
    }
    setPendingIndex(nextIndex);
    setOffers(next.map((a) => a.id));
    setPhase("augment");
  };

  const pickAugment = (id: AugmentId) => {
    const nextOwned = [...owned, id];
    setOwned(nextOwned);
    const next = pendingIndex ?? 0;
    setPendingIndex(null);
    setOffers([]);
    resetBattle(next);
  };

  const startGame = () => {
    setPlayerHp(100);
    setGold(28);
    setBag({ ...EMPTY_BAG });
    setOwned([]);
    setTurns(0);
    setEnemyIndex(0);
    setHp(ENEMIES[0].maxHp);
    setStack([]);
    setMarked([]);
    setStroke([]);
    setLiveStroke([]);
    setReport("");
    openAugment(0, []);
  };

  const placePoint = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setFeedback("숫자로 입력하거나 그래프를 클릭하세요.");
      return;
    }
    const c = classifyAgainst(curve, x, y);
    if (marked.some((m) => Math.abs(m.x - c.x) < 0.08 && Math.abs(m.y - c.y) < 0.08)) {
      setFeedback("이미 찍은 점입니다.");
      return;
    }
    const nextValid = validCount + (c.valid ? 1 : 0);
    const nextTraps = trapCount + (c.valid ? 0 : 1);
    const nextCombo = nextTraps > 0 ? 0 : nextValid;
    setMarked((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, ...c }]);
    setXInput("");
    setYInput("");
    playMark(c.valid, nextCombo);
    if (c.valid && nextCombo >= 2) {
      setCallout({ id: `${Date.now()}-c`, text: `콤보 ×${nextCombo}`, kind: "combo" });
      setFeedback(`약점 (${fmt(c.x)}, ${fmt(c.y)}) · 콤보 ×${nextCombo} · 피해 ${nextCombo === 2 ? "1.15" : comboMultiplier(nextCombo).toFixed(2)}배`);
    } else if (c.valid && nextTraps > 0) {
      setCallout({ id: `${Date.now()}-c`, text: "맞았지만 콤보 없음", kind: "hurt" });
      setFeedback(`약점 (${fmt(c.x)}, ${fmt(c.y)}). 빗나간 점을 지우면 콤보가 돌아옵니다.`);
    } else if (c.valid) {
      setCallout({ id: `${Date.now()}-c`, text: "적중", kind: "hit" });
      setFeedback(`약점 (${fmt(c.x)}, ${fmt(c.y)}). 하나 더 맞추면 콤보입니다.`);
    } else {
      setCallout({ id: `${Date.now()}-c`, text: "콤보 끊김", kind: "hurt" });
      setFeedback(`빗나간 점 (${fmt(c.x)}, ${fmt(c.y)}). 따라가면 패널티, 콤보도 끊깁니다.`);
    }
  };

  const submitCoords = () => {
    placePoint(parseCoord(xInput), parseCoord(yInput));
    xField.current?.focus();
  };

  const undoPoint = () => {
    if (!marked.length || phase === "slash") return;
    const next = marked.slice(0, -1);
    setMarked(next);
    const traps = next.some((m) => !m.valid);
    const valids = next.filter((m) => m.valid).length;
    setFeedback(!traps && valids >= 2 ? `마지막 점을 취소했습니다. 콤보 ×${valids}` : "마지막 점을 취소했습니다.");
  };

  const clearTraps = () => {
    const next = marked.filter((m) => m.valid);
    if (next.length === marked.length) {
      setFeedback("빗나간 점이 없습니다.");
      return;
    }
    setMarked(next);
    setFeedback(next.length >= 2 ? `틀린 점을 지웠습니다. 콤보 ×${next.length}` : "틀린 점을 지웠습니다.");
  };

  const clearStroke = () => {
    setStroke([]);
    setLiveStroke([]);
    setFeedback("궤적을 지웠습니다. 약점에 붙여 다시 긋으세요.");
  };

  const buy = (id: ItemId) => {
    const item = SHOP.find((s) => s.id === id)!;
    if (gold < item.cost) return;
    setGold((g) => g - item.cost);
    setBag((b) => ({ ...b, [id]: b[id] + 1 }));
    setFeedback(`${item.name}을 샀습니다.`);
  };

  const apply = (t: Transform) => {
    const id: ItemId = t.kind === "translate" ? "translate" : t.kind;
    if (bag[id] <= 0) return;
    setBag((b) => ({ ...b, [id]: b[id] - 1 }));
    setStack((s) => [...s, t]);
    setMarked([]);
    setStroke([]);
    setLiveStroke([]);
    setTranslateOpen(false);
    setFeedback(`${transformLabel(t)} 적용. 점이 초기화됐습니다. 새 식을 계산하세요.`);
    setPhase("mark");
  };

  const useItem = (id: ItemId) => {
    if (bag[id] <= 0) return;
    if (id === "translate") {
      setTranslateOpen(true);
      return;
    }
    apply({ kind: id });
  };

  const confirmTranslate = () => {
    const h = Number(dx);
    const k = Number(dy);
    if (!Number.isFinite(h) || !Number.isFinite(k)) {
      setFeedback("평행이동 값을 숫자로 넣으세요.");
      return;
    }
    apply({ kind: "translate", h, k });
  };

  const executeSlash = () => {
    if (validCount < enemy.minMarks) {
      setFeedback(`약점 점을 ${enemy.minMarks}개 이상 맞춰야 벨 수 있습니다.`);
      return;
    }
    const path = liveStroke.length >= 8 ? liveStroke : stroke;
    if (path.length < 8) {
      setFeedback("궤적이 너무 짧습니다. 약점을 따라 더 길게 긋으세요.");
      return;
    }
    const raw = scoreSlash(
      curve,
      path,
      marked,
      enemy.baseDamage,
      stack.length,
      enemy.requireTransform
    );
    const result = applyAugments(raw, owned, {
      validMarks: validCount,
      trapCount,
      transformCount: stack.length,
      hasAxisReflect: stack.some((t) => t.kind === "reflectX" || t.kind === "reflectY" || t.kind === "reflectOrigin"),
      hasYX: stack.some((t) => t.kind === "reflectYX"),
      shape: enemy.shape,
      baseDamage: enemy.baseDamage,
      coverage: raw.coverage,
      combo,
    });
    setLastScore(result);
    playSlash(result.grade);
    setPhase("slash");
    setSlashProgress(0);
    playSlashTimeline((t) => setSlashProgress(t), () => finishSlash(result));
  };

  const finishSlash = (result: SlashResult) => {
    const nextEnemyHp = Math.max(0, hp - result.damage);
    const afterTrap = Math.max(0, playerHp - result.selfDamage);
    setHp(nextEnemyHp);
    setPlayerHp(afterTrap);
    setGold((g) => g + Math.max(1, Math.round(result.damage * 0.45)));
    const notes: Floater[] = [
      {
        id: `${Date.now()}-d`,
        text: combo >= 2 ? `−${result.damage}  콤보 ×${combo}` : `−${result.damage}`,
        kind: "hit",
      },
    ];
    if (result.selfDamage > 0) {
      notes.push({ id: `${Date.now()}-s`, text: `패널티 −${result.selfDamage}`, kind: "hurt" });
    }
    setFloaters(notes);
    setReport(
      `${gradeLabel(result, enemy.requireTransform && stack.length === 0, combo)} · 피해 ${result.damage} · 모양 ${Math.round(result.accuracy * 100)}%`
    );
    setTurns((n) => n + 1);

    window.setTimeout(() => {
      setFloaters([]);
      if (afterTrap <= 0) {
        setPhase("defeat");
        return;
      }
      if (nextEnemyHp <= 0) {
        if (enemyIndex >= ENEMIES.length - 1) setPhase("victory");
        else openAugment(enemyIndex + 1, owned);
        return;
      }
      const retaliate = Math.round(14 + enemyIndex * 5 + (1 - result.accuracy) * 12);
      const next = Math.max(0, afterTrap - retaliate);
      setPlayerHp(next);
      if (next <= 0) {
        setPhase("defeat");
        return;
      }
      setFeedback(
        enemy.requireTransform && stack.length === 0
          ? `변환하지 않아 약점이 닫혀 있습니다. 반격 −${retaliate}`
          : result.trapRatio > 0.2
            ? `잘못된 점을 따라갔습니다. 반격 −${retaliate}`
            : `반격 −${retaliate}`
      );
      setStroke([]);
      setLiveStroke([]);
      setLastScore(null);
      setSlashProgress(0);
      setPhase("draw");
    }, 1280);
  };

  const slashRef = useRef({ slash: executeSlash, undo: undoPoint });
  useEffect(() => {
    slashRef.current.slash = executeSlash;
    slashRef.current.undo = undoPoint;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "mark" && phase !== "draw") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      const undoKey = e.key === "z" || e.key === "Z" || (e.key === "Backspace" && !typing);
      if (undoKey && !typing) {
        e.preventDefault();
        slashRef.current.undo();
      }
      if (e.key === "Escape" && phase === "draw") {
        setStroke([]);
        setLiveStroke([]);
      }
      if (e.key === " " && phase === "draw" && !typing) {
        e.preventDefault();
        slashRef.current.slash();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const slashHot = preview.ready && preview.accuracy >= 0.8;
  useEffect(() => {
    if (phase !== "draw" || !slashHot) return;
    playTone(920, 0.05);
  }, [phase, slashHot]);

  if (phase === "title") return <TitleScreen onStart={startGame} />;
  if (phase === "augment") {
    return <AugmentPicker offers={offers} owned={owned} onPick={pickAugment} />;
  }
  if (phase === "victory" || phase === "defeat") {
    return <EndScreen win={phase === "victory"} turns={turns} onRestart={startGame} />;
  }

  const step = phase === "mark" ? 1 : phase === "draw" ? 2 : 3;
  const slashKind = lastScore && lastScore.trapRatio > 0.28 ? "trap" : "clean";
  const busy = phase === "slash";

  return (
    <div className="min-h-dvh bg-[#0c0e12] px-4 py-5 text-[#f4efe6] sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#161a22] px-4 py-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.8)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <EnemyPortrait kind={enemy.silhouette} color={enemy.color} />
              {phase === "slash" && (
                <span className="pointer-events-none absolute inset-0 animate-[cutMark_0.6s_ease-out_forwards] bg-[linear-gradient(115deg,transparent_42%,#fff_49%,#1a1410_51%,transparent_58%)] mix-blend-multiply" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[#d7b56d]">
                {enemy.course} · {enemy.unit} · {enemyIndex + 1}/{ENEMIES.length} · 금화 {gold}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[#f7f1e6] sm:text-4xl">
                {enemy.name}
              </h1>
              <p
                data-testid="equation-header"
                className="mt-0.5 font-[family-name:var(--font-display),var(--font-kr),sans-serif] text-2xl leading-tight text-[#ffe7a3] sm:text-3xl"
              >
                {enemy.equation}
              </p>
              <p className="text-sm text-[#b7ab9a]">{enemy.title}</p>
            </div>
          </div>
          <div className="grid w-full max-w-sm gap-2">
            <HpBar label="상대" value={(hp / enemy.maxHp) * 100} text={`${hp} / ${enemy.maxHp}`} color="#c45c3e" />
            <HpBar label="나" value={playerHp} text={`${playerHp} / 100`} color="#2f8f7b" />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Steps current={step} />
          {combo >= 2 && (
            <span className="rounded-full bg-[#c44532] px-3 py-1 text-sm font-semibold text-white">
              콤보 ×{combo} · {comboRate.toFixed(2)}배
            </span>
          )}
          {combo === 0 && trapCount > 0 && (
            <span className="rounded-full bg-[#3a2420] px-3 py-1 text-sm text-[#ffb199]">콤보 끊김</span>
          )}
          {owned.map((id) => (
            <span key={id} className="rounded-full border border-[#d7b56d]/40 px-3 py-1 text-xs text-[#d7b56d]">
              {augmentById(id).name}
            </span>
          ))}
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.86fr)]">
          <section
            className={`relative overflow-hidden rounded-3xl border bg-[#fffcf6] text-[#1c1814] shadow-[0_24px_60px_-36px_rgba(80,50,20,0.5)] ${
              phase === "slash"
                ? "animate-[shake_0.48s_ease-in-out] border-[#e2d3bc]"
                : phase === "draw" && preview.accuracy >= 0.62
                  ? "border-[#e2b340] ring-4 ring-[#e2b340]/80"
                  : "border-[#e2d3bc]"
            }`}
          >
            <div className="border-b border-[#eadfcf] bg-[#1c1814] px-4 py-3 text-[#fff8ea]">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#d7b56d]">약점 식</p>
              <p
                data-testid="equation"
                className="mt-1 font-[family-name:var(--font-display),var(--font-kr),sans-serif] text-[1.7rem] leading-tight tracking-tight text-[#fff8ea] sm:text-4xl"
              >
                {enemy.equation}
              </p>
              {stack.length > 0 && (
                <p className="mt-1 text-sm text-[#f0d48a]">{equation}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-[#d9d0c3]">{enemy.hint}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-[#d7eee8] px-2.5 py-1 text-[#24675c]">약점 {validCount}</span>
                <span className="rounded-full bg-[#f8ddd6] px-2.5 py-1 text-[#8a3a2c]">빗나감 {trapCount}</span>
                {validCount >= enemy.minMarks && phase !== "slash" && (
                  <span className="rounded-full bg-[#ffe7a3] px-2.5 py-1 font-semibold text-[#1c1814]">벨 준비</span>
                )}
                {stack.map((t, i) => (
                  <span key={i} className="rounded-full bg-[#efe6d6] px-2.5 py-1 text-[#3c342c]">
                    {transformLabel(t)}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative w-full">
              <GraphCanvas
                curve={curve}
                view={view}
                color={enemy.color}
                marked={marked}
                stroke={stroke}
                onStrokeChange={(pts) => {
                  setStroke(pts);
                  setLiveStroke(pts);
                }}
                onStrokeLive={setLiveStroke}
                onDrawStart={() => setStroke([])}
                onPlacePoint={(p) => placePoint(p.x, p.y)}
                onRemovePoint={(id) => {
                  const next = marked.filter((m) => m.id !== id);
                  const traps = next.some((m) => !m.valid);
                  const valids = next.filter((m) => m.valid).length;
                  setMarked(next);
                  if (!traps && valids >= 2) {
                    setCallout({ id: `${Date.now()}-c`, text: `콤보 ×${valids}`, kind: "combo" });
                    setFeedback(`빗나간 점을 지웠습니다. 콤보 ×${valids}`);
                  } else setFeedback("점을 지웠습니다.");
                }}
                mode={phase === "slash" ? "slash" : phase === "draw" ? "draw" : "mark"}
                combo={combo}
                slashProgress={slashProgress}
                slashKind={slashKind}
              />
              <SlashFlash active={phase === "slash"} trap={slashKind === "trap"} />
              {combo >= 1 && phase !== "slash" && (
                <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#1c1814]/88 px-3 py-1 text-xs text-[#ffe7a3]">
                  {combo >= 2 ? `맞춘 자리만 열림 · 콤보 ×${combo}` : "맞춘 자리 주변만 열림"}
                </p>
              )}
              {phase === "draw" && (
                <div className="pointer-events-none absolute bottom-3 right-3 w-40" data-testid="heat">
                  <HeatMeter read={preview} validCount={validCount} />
                </div>
              )}
              {callout && phase !== "slash" && (
                <p
                  key={callout.id}
                  className={`pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 animate-[floatUp_0.78s_ease-out_forwards] font-[family-name:var(--font-display)] text-4xl font-bold ${
                    callout.kind === "hurt" ? "text-[#c45c3e]" : "text-[#1f6f5d]"
                  }`}
                >
                  {callout.text}
                </p>
              )}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 space-y-1 text-center">
              {floaters.map((f) => (
                <p
                  key={f.id}
                  className={`animate-[floatUp_1.25s_ease-out_forwards] font-[family-name:var(--font-display)] font-bold ${
                    f.kind === "hurt"
                      ? "text-2xl text-[#8a3a2c]"
                      : "text-6xl text-[#9d1c1c] [text-shadow:0_2px_0_#fff8ea]"
                  }`}
                >
                  {f.text}
                </p>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-3xl border border-[#e2d3bc] bg-[#fffcf6] p-4 text-[#1c1814] shadow-[0_24px_60px_-36px_rgba(80,50,20,0.45)] sm:p-5">
            {phase === "mark" && (
              <div className="flex flex-col gap-3">
                <p className="text-[15px] leading-relaxed text-[#4d463c]">
                  식을 보고 약점 {validCount}/{enemy.minMarks}개를 맞추세요. 그래프를 눌러 찍고, 찍힌 점을 다시 누르면 지워집니다.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="x" value={xInput} onChange={setXInput} onEnter={submitCoords} inputRef={xField} />
                  <Field label="y" value={yInput} onChange={setYInput} onEnter={submitCoords} />
                  <GameButton tone="accent" onClick={submitCoords}>
                    좌표 입력
                  </GameButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GameButton tone="ghost" onClick={undoPoint} disabled={!marked.length}>
                    마지막 취소
                  </GameButton>
                  <GameButton tone="ghost" onClick={clearTraps} disabled={trapCount === 0}>
                    틀린 점 지우기
                  </GameButton>
                </div>
                <GameButton onClick={() => setPhase("draw")}>
                  {validCount >= enemy.minMarks ? `선 긋기 · 약점 ${validCount}` : `선 긋기 · ${validCount}/${enemy.minMarks}`}
                </GameButton>
                <p className="text-xs text-[#6d6456]">분수 입력 가능 (1/2). Z 키로 마지막 점을 취소합니다.</p>
              </div>
            )}

            {phase === "draw" && (
              <div className="flex flex-col gap-3">
                <p className="text-[15px] leading-relaxed text-[#4d463c]">
                  {heatLabel(preview)}. 빨간 점을 따라가면 내가 다칩니다.
                  {combo >= 2 ? ` 콤보 ×${combo}, 피해 ${comboRate.toFixed(2)}배.` : ""}
                </p>
                <HeatMeter read={preview} validCount={validCount} />
                <div className="flex flex-wrap gap-2">
                  <GameButton tone="ghost" onClick={clearStroke}>
                    다시 긋기
                  </GameButton>
                  <GameButton
                    tone={preview.ready && preview.accuracy >= 0.62 ? "hot" : "primary"}
                    disabled={validCount < enemy.minMarks || !preview.ready}
                    onClick={executeSlash}
                  >
                    {validCount < enemy.minMarks
                      ? `베기 · 약점 ${validCount}/${enemy.minMarks}`
                      : preview.ready
                        ? "베기"
                        : "선을 먼저"}
                  </GameButton>
                  <GameButton tone="ghost" onClick={() => setPhase("mark")}>
                    점 고치기
                  </GameButton>
                </div>
                <p className="text-xs text-[#6d6456]">스페이스로 베기 · Esc로 선 지우기 · Z로 점 취소</p>
              </div>
            )}

            {phase === "slash" && lastScore && (
              <div className="space-y-1">
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[#c45c3e]">
                  {gradeLabel(lastScore, enemy.requireTransform && stack.length === 0, combo)}
                </p>
                <p className="text-sm text-[#4d463c]">
                  모양 {Math.round(lastScore.accuracy * 100)}% · 길이 {Math.round(lastScore.coverage * 100)}%
                </p>
              </div>
            )}

            {translateOpen && (
              <div className="rounded-2xl border border-[#e4d9c8] bg-white p-3">
                <p className="mb-2 text-sm font-semibold">평행이동 (h, k)</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="h" value={dx} onChange={setDx} onEnter={confirmTranslate} />
                  <Field label="k" value={dy} onChange={setDy} onEnter={confirmTranslate} />
                  <GameButton onClick={confirmTranslate}>적용</GameButton>
                  <GameButton tone="ghost" onClick={() => setTranslateOpen(false)}>
                    취소
                  </GameButton>
                </div>
              </div>
            )}

            <ItemShop gold={gold} bag={bag} disabled={busy} onBuy={buy} onUse={useItem} />

            {report && (
              <p data-testid="report" className="rounded-2xl bg-[#1c1814] px-3 py-2 text-sm font-semibold text-[#ffe7a3]">
                {report}
              </p>
            )}
            {feedback && (
              <p className="rounded-2xl bg-[#f3eadc] px-3 py-2 text-sm text-[#4d463c]">{feedback}</p>
            )}

            <ol className="mt-auto space-y-1 border-t border-[#eadfcf] pt-3 text-sm text-[#6d6456]">
              <li>1. 식을 보고 점을 찍고, 틀리면 취소</li>
              <li>2. 선이 금색·일섬이 되면 베기</li>
              <li>3. 빗나가면 점이 남은 채로 다시 긋기</li>
            </ol>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c0e12] px-4 py-10 text-[#f4efe6]">
      <div className="relative w-full max-w-xl">
        <p className="mb-4 text-center text-[11px] tracking-[0.42em] text-[#d7b56d]">공통수학 1 · 2</p>
        <div className="rounded-[28px] border border-white/10 bg-[#161a22] p-8 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.9)] sm:p-10">
          <p className="text-sm text-[#d7b56d]">방정식 · 다항식 · 경우의 수 · 도형 · 함수</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-tight sm:text-6xl">약점베기</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[#c9bfb2]">
            단원마다 약점이 다릅니다. 결투 전에 증강을 하나 고르고, 숨은 그래프를 계산해 검으로 가르세요.
          </p>
          <GameButton className="mt-8 h-12 w-full text-base" onClick={onStart}>
            결투 시작
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function EndScreen({
  win,
  turns,
  onRestart,
}: {
  win: boolean;
  turns: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0c0e12] px-4 text-[#f4efe6]">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#161a22] p-8 sm:p-10">
        <h2 className="font-[family-name:var(--font-display)] text-4xl">{win ? "단원을 끝냈다" : "여기서 멈췄다"}</h2>
        <p className="mt-3 text-[16px] text-[#c9bfb2]">
          {win ? `총 ${turns}번의 참격.` : "증강을 단원에 맞게 고르고, 점을 더 맞춰 보세요."}
        </p>
        <GameButton className="mt-8 h-12 w-full text-base" onClick={onRestart}>
          다시 하기
        </GameButton>
      </div>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const items = ["점 찍기", "궤적", "베기"];
  return (
    <ol className="flex flex-wrap gap-2">
      {items.map((label, i) => {
        const n = i + 1;
        return (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-sm ${
              current === n
                ? "bg-[#c44532] text-white"
                : current > n
                  ? "bg-[#1f3a34] text-[#9ddecb]"
                  : "bg-white/8 text-[#b7ab9a]"
            }`}
          >
            {n}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function HpBar({
  label,
  value,
  text,
  color,
}: {
  label: string;
  value: number;
  text: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-[#b7ab9a]">
        <span>{label}</span>
        <span>{text}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onEnter,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[#6d6456]">
      {label}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        className="h-11 w-24 rounded-xl border border-[#e4d9c8] bg-white px-3 font-mono text-base text-[#1c1814] outline-none focus:border-[#c45c3e]"
      />
    </label>
  );
}

function HeatMeter({
  read,
  validCount,
}: {
  read: ReturnType<typeof assessStroke>;
  validCount: number;
}) {
  const pct = Math.round(read.accuracy * 100);
  return (
    <div className="rounded-2xl bg-[#1c1814] px-3 py-2 text-[#fff8ea]">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span>{heatLabel(read)}</span>
        <span>{read.ready ? `${pct}%` : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{
            width: `${read.ready ? pct : 0}%`,
            background: read.accuracy >= 0.62 ? "#e2b340" : read.accuracy >= 0.4 ? "#c45c3e" : "#8a6a3b",
          }}
        />
      </div>
      <p className="mt-1 text-[11px] text-[#d9d0c3]">
        {read.ready
          ? `점 통과 ${Math.round(read.markTouch * validCount)}/${validCount} · 길이 ${Math.round(read.coverage * 100)}%`
          : `찍은 약점 ${validCount}개`}
      </p>
    </div>
  );
}

function heatLabel(read: ReturnType<typeof assessStroke>) {
  if (!read.ready) return "선을 길게 긋세요";
  if (read.accuracy >= 0.84) return "일섬";
  if (read.accuracy >= 0.62) return "달아오름";
  if (read.accuracy >= 0.4) return "따뜻함";
  return "차가움";
}

function gradeLabel(score: SlashResult, locked: boolean, combo: number) {
  if (locked) return "약점이 닫혀 있다";
  if (score.trapRatio > 0.38) return "잘못된 약점";
  if (score.grade === "PERFECT") return combo >= 3 ? "연쇄 일섬" : "한칼에 가름";
  if (score.grade === "CRITICAL") return combo >= 2 ? "콤보로 깊게" : "깊게 베었다";
  if (score.grade === "HIT") return "스쳤다";
  return "빗나갔다";
}

function playSlashTimeline(onFrame: (t: number) => void, onDone: () => void) {
  const started = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / 620);
    onFrame(t);
    if (t < 1) requestAnimationFrame(tick);
    else onDone();
  };
  requestAnimationFrame(tick);
}

function parseCoord(raw: string) {
  const s = raw.trim().replace(/−/g, "-").replace(/\s/g, "");
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return Number.NaN;
    return Number(frac[1]) / den;
  }
  return Number(s);
}

function fmt(n: number) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
