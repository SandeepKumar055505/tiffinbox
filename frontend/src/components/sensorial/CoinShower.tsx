import React from 'react';

interface CoinShowerProps {
  active: boolean;
}

export const CoinShower: React.FC<CoinShowerProps> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
      <span className="text-2xl">🪙</span>
    </div>
  );
};
