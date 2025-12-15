import { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '@/types/raffle';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface SlotAnimationProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
  isBonusPrize?: boolean;
}

export function SlotAnimation({ 
  participants, 
  winner, 
  isSpinning, 
  onSpinComplete,
  isBonusPrize 
}: SlotAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Generate random display names for animation
  const generateRandomNames = useCallback(() => {
    const names: string[] = [];
    for (let i = 0; i < 20; i++) {
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
      names.push(randomParticipant?.name || 'Loading...');
    }
    return names;
  }, [participants]);

  useEffect(() => {
    if (isSpinning && participants.length > 0) {
      // If user prefers reduced motion, skip animation and reveal immediately
      if (prefersReducedMotion) {
        timeoutRef.current = window.setTimeout(() => {
          onSpinComplete();
        }, 500);
        return;
      }

      setDisplayNames(generateRandomNames());
      
      // Start fast cycling
      let speed = 50;
      let iterations = 0;
      const maxIterations = 40;

      const cycle = () => {
        iterations++;
        setCurrentIndex(prev => (prev + 1) % 20);
        
        // Gradually slow down
        if (iterations > maxIterations * 0.6) {
          speed = Math.min(speed + 15, 300);
        }
        
        if (iterations < maxIterations) {
          intervalRef.current = window.setTimeout(cycle, speed);
        } else {
          // Final reveal
          if (winner) {
            setDisplayNames(prev => {
              const newNames = [...prev];
              newNames[currentIndex % 20] = winner.name;
              return newNames;
            });
          }
          timeoutRef.current = window.setTimeout(() => {
            onSpinComplete();
          }, 500);
        }
      };

      cycle();
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, participants, winner, generateRandomNames, onSpinComplete, prefersReducedMotion]);

  const visibleNames = displayNames.slice(
    Math.max(0, currentIndex - 2),
    currentIndex + 3
  );

  // Pad if needed
  while (visibleNames.length < 5) {
    visibleNames.push(displayNames[visibleNames.length % displayNames.length] || '...');
  }

  if (!isSpinning && winner) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        {isBonusPrize && (
          <div className="mb-4 px-6 py-2 bg-accent text-accent-foreground rounded-full font-bold text-lg animate-pulse">
            ⭐ BONUS PRIZE ⭐
          </div>
        )}
        <div className="text-6xl md:text-8xl font-bold text-primary text-center animate-scale-in">
          {winner.name}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[400px] overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      
      {/* Center highlight */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 bg-primary/10 border-y-2 border-primary z-5" />
      
      {/* Scrolling names */}
      <div 
        className="absolute inset-x-0 transition-transform duration-100"
        style={{ 
          transform: `translateY(${-currentIndex * 80 + 160}px)`,
        }}
      >
        {displayNames.map((name, index) => (
          <div
            key={index}
            className={`
              h-20 flex items-center justify-center text-4xl md:text-5xl font-bold
              transition-all duration-100
              ${index === currentIndex ? 'text-primary scale-110' : 'text-muted-foreground/40 scale-90'}
            `}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
