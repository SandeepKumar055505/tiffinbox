import { useState, useEffect } from 'react';

export type AtmospherePhase = 'dawn' | 'zenith' | 'surrender' | 'twilight';

interface Atmosphere {
  phase: AtmospherePhase;
  label: string;
  gradient: string;
  accent: string;
}

const ATMOSPHERES: Record<AtmospherePhase, Atmosphere> = {
  dawn: {
    phase: 'dawn',
    label: 'Morning Genesis',
    gradient: 'from-orange-200/5 via-blue-50/5 to-white/0',
    accent: '#fde68a', // Amber 200
  },
  zenith: {
    phase: 'zenith',
    label: 'High-Noon Vitality',
    gradient: 'from-blue-400/5 via-cyan-200/5 to-white/0',
    accent: '#22d3ee', // Cyan 400
  },
  surrender: {
    phase: 'surrender',
    label: 'Golden Hour Sacrament',
    gradient: 'from-rose-400/10 via-orange-300/5 to-white/0',
    accent: '#fb923c', // Orange 400
  },
  twilight: {
    phase: 'twilight',
    label: 'Indigene Obsidian',
    gradient: 'from-indigo-950/20 via-slate-900/10 to-transparent',
    accent: '#818cf8', // Indigo 400
  },
};

export const useLivingTheme = () => {
  const [atmosphere, setAtmosphere] = useState<Atmosphere>(ATMOSPHERES.zenith);

  useEffect(() => {
    const calculatePhase = () => {
      // Calculate IST hour (UTC + 5:30)
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMin = now.getUTCMinutes();
      
      let istHour = utcHour + 5;
      let istMin = utcMin + 30;
      
      if (istMin >= 60) {
        istHour += 1;
        istMin -= 60;
      }
      istHour = istHour % 24;

      if (istHour >= 5 && istHour < 9) return ATMOSPHERES.dawn;
      if (istHour >= 9 && istHour < 16) return ATMOSPHERES.zenith;
      if (istHour >= 16 && istHour < 21) return ATMOSPHERES.surrender;
      return ATMOSPHERES.twilight;
    };

    setAtmosphere(calculatePhase());
    
    // Recalculate every minute
    const timer = setInterval(() => {
      setAtmosphere(calculatePhase());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return atmosphere;
};
