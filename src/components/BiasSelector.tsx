import { useMemo } from 'react';
import type { BiasPosition } from '../types';
import { biasOptions } from '../data/bias';

const BIAS_COLORS = ['#ef4444', '#db2777', '#a855f7', '#6366f1', '#3b82f6'];

interface BiasSelectorProps {
  value: BiasPosition;
  onChange: (value: BiasPosition) => void;
}

export function BiasSelector({ value, onChange }: BiasSelectorProps) {
  const selectedIndex = biasOptions.findIndex(b => b.id === value);
  const selectedLabel = biasOptions.find(b => b.id === value)?.label || '';

  const gradientStyle = useMemo(() => ({
    background: 'linear-gradient(to right, #ef4444, #a855f7, #3b82f6)'
  }), []);

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>← Extreme Left</span>
        <span>Moderate</span>
        <span>Extreme Right →</span>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Gradient track */}
        <div
          className="absolute inset-x-0 h-1 rounded-full"
          style={gradientStyle}
        />

        {/* Clickable positions */}
        <div className="relative w-full flex justify-between">
          {biasOptions.map((bias, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={bias.id}
                onClick={() => onChange(bias.id)}
                className="relative flex flex-col items-center group cursor-pointer"
                aria-label={bias.label}
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: isSelected ? 16 : 12,
                    height: isSelected ? 16 : 12,
                    backgroundColor: isSelected ? '#ffffff' : '#94a3b8',
                    border: isSelected ? `2px solid ${BIAS_COLORS[index]}` : 'none',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs font-medium text-slate-400">
        {biasOptions.map(bias => (
          <span
            key={bias.id}
            className={bias.id === value ? 'text-white' : ''}
          >
            {bias.shortLabel}
          </span>
        ))}
      </div>

      <div className="text-sm text-slate-300">
        Current: <span className="text-white font-medium">{selectedLabel}</span>
      </div>
    </div>
  );
}
