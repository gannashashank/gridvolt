import React from 'react';

interface BulletItem {
  label: string;
  value: string;
}

interface SpecCardProps {
  tag: string;
  title: string;
  primaryStat?: string;
  primaryStatLabel?: string;
  bullets: BulletItem[];
  highlight?: boolean;
}

export default function SpecCard({
  tag,
  title,
  primaryStat,
  primaryStatLabel,
  bullets,
  highlight = false,
}: SpecCardProps) {
  return (
    <div
      className={`skyroot-card p-6 relative overflow-hidden flex flex-col justify-between ${
        highlight ? 'border-skyroot-accent/40 bg-skyroot-card/90' : ''
      }`}
    >
      {/* Top Hairline Indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono tracking-[0.2em] text-skyroot-muted uppercase">
          {tag}
        </span>
        <span className="w-1.5 h-1.5 bg-skyroot-accent/80"></span>
      </div>

      {/* Card Title & Headline Stat */}
      <div className="mb-6">
        <h3 className="text-base font-medium tracking-tight text-white mb-2 uppercase">
          {title}
        </h3>
        {primaryStat && (
          <div className="mt-2">
            <div className="text-3xl lg:text-4xl font-light tracking-tight text-white font-mono">
              {primaryStat}
            </div>
            {primaryStatLabel && (
              <div className="text-[10px] font-mono tracking-widest text-skyroot-muted uppercase mt-0.5">
                {primaryStatLabel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bullets List (Vikram-I pattern) */}
      <div className="space-y-3 pt-4 border-t border-skyroot-border/80 text-xs">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start justify-between space-x-2">
            <span className="text-neutral-400 text-[11px] uppercase tracking-wider font-mono">
              {b.label}
            </span>
            <span className="text-white text-[11px] font-mono font-medium text-right">
              {b.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
