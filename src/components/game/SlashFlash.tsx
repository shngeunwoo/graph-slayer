"use client";

export function SlashFlash({ active, trap }: { active: boolean; trap: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute left-[-20%] top-[12%] h-28 w-[150%] origin-left ${
          trap ? "bg-gradient-to-r from-transparent via-[#ff7a55]/80 to-transparent" : "bg-gradient-to-r from-transparent via-[#fff6d0]/90 to-transparent"
        } blur-[1px] animate-[bladeSweep_0.42s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
      />
      <div
        className={`absolute left-[-10%] top-[42%] h-3 w-[130%] ${
          trap ? "bg-[#c45c3e]" : "bg-white"
        } opacity-80 animate-[bladeSweep_0.5s_0.04s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
      />
    </div>
  );
}
