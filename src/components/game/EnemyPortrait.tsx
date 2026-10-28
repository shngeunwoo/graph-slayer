import type { Enemy } from "@/lib/game/types";

export function EnemyPortrait({
  kind,
  color,
}: {
  kind: Enemy["silhouette"];
  color: string;
}) {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden className="shrink-0">
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="38" r="38" fill="url(#halo)" />
      <circle cx="38" cy="38" r="30" fill="#fff6ea" stroke="#eadfcf" strokeWidth="2" />
      <g transform="translate(2 2)">
      {kind === "slime" && <Slime color={color} />}
      {kind === "knight" && <Goblin color={color} />}
      {kind === "wolf" && <Wolf color={color} />}
      {kind === "mage" && <Mage color={color} />}
      {kind === "dragon" && <Dragon color={color} />}
      </g>
    </svg>
  );
}

function Face({ y = 34 }: { y?: number }) {
  return (
    <>
      <circle cx="28" cy={y} r="2.4" fill="#2c281f" />
      <circle cx="44" cy={y} r="2.4" fill="#2c281f" />
      <path d="M31 42c3 3 7 3 10 0" fill="none" stroke="#2c281f" strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function Slime({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="36" cy="44" rx="22" ry="16" fill={color} />
      <ellipse cx="36" cy="38" rx="18" ry="14" fill={color} />
      <ellipse cx="28" cy="32" rx="4" ry="2.2" fill="white" opacity="0.45" />
      <Face y={36} />
    </g>
  );
}

function Goblin({ color }: { color: string }) {
  return (
    <g>
      <circle cx="36" cy="36" r="16" fill={color} />
      <path d="M18 28l10 6 2-8zM54 28l-10 6-2-8z" fill={color} />
      <rect x="28" y="50" width="16" height="10" rx="3" fill="#c4a574" />
      <Face />
    </g>
  );
}

function Wolf({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="36" cy="40" rx="18" ry="14" fill={color} />
      <path d="M18 24l10 14H18zM54 24l-10 14h10z" fill={color} />
      <ellipse cx="36" cy="46" rx="8" ry="5" fill="#f3d7b0" />
      <Face y={36} />
    </g>
  );
}

function Mage({ color }: { color: string }) {
  return (
    <g>
      <path d="M36 10l16 22H20z" fill={color} />
      <circle cx="36" cy="40" r="14" fill="#f3d7b0" />
      <rect x="22" y="52" width="28" height="10" rx="4" fill={color} />
      <Face y={38} />
    </g>
  );
}

function Dragon({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="36" cy="40" rx="20" ry="15" fill={color} />
      <path d="M16 22l12 16H14zM56 22l-12 16h14z" fill={color} />
      <path d="M36 18l4 8h-8z" fill="#d4a017" />
      <Face y={38} />
    </g>
  );
}
