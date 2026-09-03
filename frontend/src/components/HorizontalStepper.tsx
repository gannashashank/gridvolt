import React from 'react';

interface HorizontalStepperProps {
  currentStatus: string;
}

const STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'en_route', label: 'En Route' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'servicing', label: 'Servicing' },
  { key: 'completed', label: 'Completed' },
];

export default function HorizontalStepper({ currentStatus }: HorizontalStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="w-full py-4">
      {/* Step Indicators */}
      <div className="grid grid-cols-6 relative">
        {/* Continuous Connecting Line */}
        <div className="absolute top-2.5 left-0 right-0 h-[1px] bg-skyroot-border z-0"></div>
        <div
          className="absolute top-2.5 left-0 h-[1px] bg-skyroot-accent transition-all duration-500 z-0"
          style={{ width: `${(activeIdx / (STEPS.length - 1)) * 100}%` }}
        ></div>

        {STEPS.map((step, idx) => {
          const isPassed = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              {/* Tick Mark */}
              <div
                className={`w-5 h-5 flex items-center justify-center font-mono text-[9px] transition-colors ${
                  isCurrent
                    ? 'bg-skyroot-accent text-white font-bold ring-4 ring-skyroot-accent/20'
                    : isPassed
                    ? 'bg-neutral-800 border border-skyroot-accent/60 text-skyroot-accent'
                    : 'bg-skyroot-card border border-skyroot-border text-neutral-500'
                }`}
              >
                {idx + 1}
              </div>

              {/* Label */}
              <span
                className={`mt-2 font-mono text-[9px] tracking-wider uppercase text-center transition-colors ${
                  isCurrent
                    ? 'text-white font-semibold'
                    : isPassed
                    ? 'text-neutral-300'
                    : 'text-neutral-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
