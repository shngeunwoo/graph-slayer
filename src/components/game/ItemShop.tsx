"use client";

import { GameButton } from "@/components/game/GameButton";
import { SHOP } from "@/lib/game/items";
import type { Inventory, ItemId } from "@/lib/game/types";

type Props = {
  gold: number;
  bag: Inventory;
  disabled?: boolean;
  onBuy: (id: ItemId) => void;
  onUse: (id: ItemId) => void;
};

export function ItemShop({ gold, bag, disabled, onBuy, onUse }: Props) {
  return (
    <details className="space-y-2 rounded-2xl border border-[#eadfcf] bg-[#fffaf4] px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
        <span>변환 아이템</span>
        <span className="rounded-full bg-[#f3eadc] px-2.5 py-0.5 font-mono text-sm font-normal">금화 {gold}</span>
      </summary>
      <ul className="mt-2 space-y-1.5">
        {SHOP.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-[#eadfcf] bg-white px-2.5 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="truncate font-mono text-[11px] text-[#7a6f61]">{item.blurb}</p>
            </div>
            <p className="text-xs text-[#6d6456]">×{bag[item.id]}</p>
            <GameButton
              tone="ghost"
              disabled={disabled || gold < item.cost}
              onClick={() => onBuy(item.id)}
              className="h-8 px-2 text-xs"
            >
              {item.cost}금
            </GameButton>
            <GameButton
              tone="accent"
              disabled={disabled || bag[item.id] <= 0}
              onClick={() => onUse(item.id)}
              className="h-8 px-2 text-xs"
            >
              사용
            </GameButton>
          </li>
        ))}
      </ul>
    </details>
  );
}
