import { Gift } from 'lucide-react';
import { Prize } from '@/types/prizes';

interface PrizeDisplayProps {
  prize: Prize | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
}

export function PrizeDisplay({ prize, size = 'md', className = '' }: PrizeDisplayProps) {
  if (!prize) return null;

  const imageSize = {
    sm: 'h-12 w-12',
    md: 'h-24 w-24',
    lg: 'h-40 w-40',
    xl: 'h-56 w-56',
    xxl: 'h-72 w-72',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl font-bold',
    xl: 'text-3xl font-bold',
    xxl: 'text-4xl font-bold',
  }[size];

  const containerSize = {
    sm: 'gap-2 p-2',
    md: 'gap-4 p-4',
    lg: 'gap-6 p-6',
    xl: 'gap-8 p-8',
    xxl: 'gap-10 p-10',
  }[size];

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
    xxl: 'h-10 w-10',
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
          <Gift className={iconSize} />
          <span>{prize.text}</span>
        </div>
      )}
    </div>
  );
}
