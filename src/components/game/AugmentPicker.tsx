"use client";

import { augmentById } from "@/lib/game/augments";
import type { AugmentId } from "@/lib/game/types";

export function AugmentPicker({
  offers,
  owned,
  onPick,
}: {
  offers: AugmentId[];
  owned: AugmentId[];
  onPick: (id: AugmentId) => void;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c0e12] px-4 py-10 text-[#f4efe6]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(900px 420px at 50% -10%, rgba(215,181,109,0.18), transparent 60%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "auto, 48px 48px, 48px 48px",
        }}
      />
      <div className="relative w-full max-w-5xl">
        <p className="text-center text-[11px] tracking-[0.42em] text-[#d7b56d]">공통수학 1 · 2</p>
        <h2 className="mt-3 text-center font-[family-name:var(--font-display)] text-5xl text-[#f7f1e6] sm:text-6xl">
          증강 선택
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-[#b7ab9a]">
          하나면 이번 결투가 끝날 때까지 남습니다. 단원에 맞는 상대에게 더 깊게 들어갑니다.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {offers.map((id) => {
            const card = augmentById(id);
            const book2 = card.course === "공통수학 2";
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(id)}
                className="group flex min-h-72 flex-col rounded-3xl border border-[#2a241c] bg-[#f6f1e7] px-5 py-6 text-left text-[#1c1814] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_40px_80px_-36px_rgba(215,181,109,0.45)]"
              >
                <span
                  className={`text-[11px] font-semibold tracking-[0.16em] ${book2 ? "text-[#8a6a2a]" : "text-[#a33b2c]"}`}
                >
                  {card.course} · {card.unit}
                </span>
                <span className="mt-8 font-[family-name:var(--font-display)] text-4xl text-[#c44532]">
                  {card.glyph}
                </span>
                <span className="mt-6 text-2xl font-bold tracking-tight">{card.name}</span>
                <span className="mt-2 text-sm leading-relaxed text-[#5c5348]">{card.effect}</span>
                <span className="mt-auto pt-6 text-xs font-semibold text-[#c44532] opacity-0 transition group-hover:opacity-100">
                  이 증강을 집는다
                </span>
              </button>
            );
          })}
        </div>
        {owned.length > 0 && (
          <p className="mt-6 text-center text-xs text-[#8d8274]">
            보유 {owned.map((id) => augmentById(id).name).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
