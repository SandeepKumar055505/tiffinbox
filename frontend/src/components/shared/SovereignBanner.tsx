import React from 'react';
import { usePublicConfig } from '../../hooks/usePublicConfig';

export function SovereignBanner() {
  const { config } = usePublicConfig();

  if (!config?.banner?.active || !config?.banner?.text) return null;

  return (
    <div className="w-full px-4 pt-3 z-[100]">
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm shrink-0">📣</span>
        <p className="text-xs font-medium text-orange-800 leading-snug">{config.banner.text}</p>
      </div>
    </div>
  );
}
