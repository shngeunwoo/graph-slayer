"use client";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "accent" | "ghost" | "hot";
  className?: string;
};

export function GameButton({
  children,
  onClick,
  disabled,
  tone = "primary",
  className = "",
}: Props) {
  const tones = {
    primary:
      "bg-[#c45c3e] text-white hover:bg-[#b04e32] disabled:bg-[#d7c7b6] disabled:text-[#8a7d6e]",
    accent:
      "bg-[#2c7a6c] text-white hover:bg-[#24675c] disabled:bg-[#d7c7b6] disabled:text-[#8a7d6e]",
    ghost:
      "bg-white text-[#2c281f] border border-[#e4d9c8] hover:bg-[#f6f1e8] disabled:opacity-50",
    hot: "bg-[#e2b340] text-[#1c1814] hover:bg-[#f0c85a] disabled:bg-[#d7c7b6] disabled:text-[#8a7d6e]",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
