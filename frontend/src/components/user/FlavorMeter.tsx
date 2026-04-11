import React, { useState, useEffect } from 'react';

type SpiceLevel = 'mild' | 'medium' | 'hot';

interface FlavorMeterProps {
  value: SpiceLevel;
  onChange: (level: SpiceLevel) => void;
}

const SPICE_MAP: Record<SpiceLevel, number> = {
  mild: 0,
  medium: 50,
  hot: 100
};

const REVERSE_MAP: Record<number, SpiceLevel> = {
  0: 'mild',
  50: 'medium',
  100: 'hot'
};

export default function FlavorMeter({ value, onChange }: FlavorMeterProps) {
  const [percent, setPercent] = useState(SPICE_MAP[value]);

  useEffect(() => {
    setPercent(SPICE_MAP[value]);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPercent(val);

    // Snap logic
    let snapped: SpiceLevel = 'mild';
    if (val > 25) snapped = 'medium';
    if (val > 75) snapped = 'hot';

    if (snapped !== value) {
      onChange(snapped);
      // Haptic feedback on snap
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  // Dynamic colors based on heat
  const getHeatColor = () => {
    if (percent < 50) return 'rgb(20, 184, 166)'; // Teal-500
    if (percent < 75) return 'rgb(249, 115, 22)'; // Orange-500
    return 'rgb(239, 68, 68)'; // Red-500
  };

  const color = getHeatColor();

  return (
    <div className="space-y-6 pt-2">
      <div className="flex justify-between items-end px-1">
        <p className="text-label-caps !text-[10px] opacity-40 font-black uppercase tracking-widest">Heat Level</p>
        <div 
          className="text-2xl transition-all duration-300 transform scale-125"
          style={{ 
            textShadow: `0 0 20px ${color}40`,
            filter: percent > 75 ? 'saturate(1.5)' : 'none'
          }}
        >
          {value === 'mild' && '🥗'}
          {value === 'medium' && '🌶️'}
          {value === 'hot' && '🔥'}
        </div>
      </div>

      <div className="relative h-12 flex items-center group">
        {/* Track Background */}
        <div className="absolute inset-0 h-1.5 my-auto bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${percent}%`, 
              backgroundColor: color,
              boxShadow: `0 0 15px ${color}60`
            }}
          />
        </div>

        {/* The Slider */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={percent}
          onChange={handleInput}
          className="
            absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10
            appearance-none bg-transparent
          "
        />

        {/* Custom Thumb Visual */}
        <div 
          className="absolute w-8 h-8 rounded-full border-4 border-bg-primary shadow-xl pointer-events-none transition-transform duration-200"
          style={{ 
            left: `calc(${percent}% - 16px)`,
            backgroundColor: color,
            boxShadow: `0 0 20px ${color}80`,
            transform: `scale(${1 + percent / 200})`
          }}
        >
          <div className="w-full h-full rounded-full animate-pulse opacity-40 bg-white" />
        </div>
      </div>

      <div className="flex justify-between px-1">
        <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${value === 'mild' ? 'opacity-100' : 'opacity-20'}`}>Mild</span>
        <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${value === 'medium' ? 'opacity-100' : 'opacity-20'}`}>Medium</span>
        <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${value === 'hot' ? 'opacity-100' : 'opacity-20'}`}>Extra Hot</span>
      </div>
    </div>
  );
}
