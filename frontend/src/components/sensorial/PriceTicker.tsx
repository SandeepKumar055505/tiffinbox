import React from 'react';

interface PriceTickerProps {
  value: number; // In Paise
  className?: string;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({ value, className = '' }) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);

  return (
    <span className={`font-black tabular-nums ${className}`}>
      {formatted}
    </span>
  );
};
