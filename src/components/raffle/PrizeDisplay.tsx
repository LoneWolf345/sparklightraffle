import { Gift } from 'lucide-react';
import { Prize } from '@/types/prizes';

interface PrizeDisplayProps {
  prize: Prize | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PrizeDisplay({ prize, size = 'md', className = '' }: PrizeDisplayProps) {
  if (!prize) return null;

  const imageSize = {
    sm: 'h-12 w-12',
    md: 'h-24 w-24',
    lg: 'h-40 w-40',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl font-bold',
  }[size];

  const containerSize = {
    sm: 'gap-2 p-2',
    md: 'gap-4 p-4',
    lg: 'gap-6 p-6',
  }[size];

  return (
    <div className={`flex items-center justify-center ${containerSize} ${className}`}>
      {(prize.displayType === 'image' || prize.displayType === 'both') && prize.imageUrl && (
        <img
          src={prize.imageUrl}
          alt="Prize"
          className={`${imageSize} object-contain rounded-lg`}
        />
      )}
      {(prize.displayType === 'text' || prize.displayType === 'both') && prize.text && (
        <div className={`flex items-center gap-2 ${textSize}`}>
          <Gift className={size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
          <span>{prize.text}</span>
        </div>
      )}
    </div>
  );
}
