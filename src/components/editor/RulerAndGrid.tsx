import React from 'react';

interface RulerProps {
  widthMm: number;
  heightMm: number;
  zoom: number;
}

export const RulerAndGrid: React.FC<RulerProps> = ({ widthMm, heightMm, zoom }) => {
  const mmToPx = (mm: number) => mm * (96 / 25.4) * zoom;

  const totalWidthPx = mmToPx(widthMm);
  const totalHeightPx = mmToPx(heightMm);

  // Generate ticks every 1mm, major tick every 5mm & 10mm
  const xTicks = [];
  for (let mm = 0; mm <= widthMm; mm++) {
    const posPx = mmToPx(mm);
    const isMajor = mm % 10 === 0;
    const isMedium = mm % 5 === 0;

    xTicks.push(
      <div
        key={`x-${mm}`}
        className="absolute top-0 border-l border-slate-300 dark:border-slate-700"
        style={{
          left: `${posPx}px`,
          height: isMajor ? '16px' : isMedium ? '10px' : '6px',
        }}
      >
        {isMajor && mm > 0 && (
          <span className="absolute top-4 -left-2 text-[8px] font-mono font-medium text-slate-500 dark:text-slate-400">
            {mm}
          </span>
        )}
      </div>
    );
  }

  const yTicks = [];
  for (let mm = 0; mm <= heightMm; mm++) {
    const posPx = mmToPx(mm);
    const isMajor = mm % 10 === 0;
    const isMedium = mm % 5 === 0;

    yTicks.push(
      <div
        key={`y-${mm}`}
        className="absolute left-0 border-t border-slate-300 dark:border-slate-700"
        style={{
          top: `${posPx}px`,
          width: isMajor ? '16px' : isMedium ? '10px' : '6px',
        }}
      >
        {isMajor && mm > 0 && (
          <span className="absolute left-4 -top-1.5 text-[8px] font-mono font-medium text-slate-500 dark:text-slate-400">
            {mm}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Top Horizontal Ruler */}
      <div
        className="absolute top-0 left-6 h-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-hidden select-none z-10"
        style={{ width: `${totalWidthPx}px` }}
      >
        {xTicks}
      </div>

      {/* Left Vertical Ruler */}
      <div
        className="absolute top-6 left-0 w-6 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden select-none z-10"
        style={{ height: `${totalHeightPx}px` }}
      >
        {yTicks}
      </div>

      {/* Corner Origin (0,0) */}
      <div className="absolute top-0 left-0 w-6 h-6 bg-slate-200 dark:bg-slate-700 border-r border-b border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-mono text-slate-600 dark:text-slate-300 z-20">
        mm
      </div>
    </>
  );
};
