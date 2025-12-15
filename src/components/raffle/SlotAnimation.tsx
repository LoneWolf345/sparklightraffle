import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Participant, RaffleConfig } from '@/types/raffle';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface SlotAnimationProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
  isBonusPrize?: boolean;
  config?: Pick<RaffleConfig, 'animationDuration' | 'animationSpeed' | 'animationScrollDistance'>;
}

const ROW_HEIGHT = 80;
const VISIBLE_ROWS = 5;
const CENTER_ROW = 2; // 0-indexed, middle of 5 visible rows

// Easing functions based on speed preset
const createEasingFunction = (speed: 'slow' | 'normal' | 'fast') => {
  return (t: number): number => {
    if (speed === 'slow') {
      // Slow: Gentler start, longer readable slow-down
      // Phase 1 = 30% time (35% distance), Phase 2 = 30% time (30% distance), Phase 3 = 40% time (35% distance)
      if (t < 0.3) {
        return 0.35 * (t / 0.3);
      } else if (t < 0.6) {
        const mediumProgress = (t - 0.3) / 0.3;
        return 0.35 + 0.3 * mediumProgress;
      } else {
        const slowProgress = (t - 0.6) / 0.4;
        return 0.65 + 0.35 * (1 - Math.pow(1 - slowProgress, 4));
      }
    } else if (speed === 'fast') {
      // Fast: Phase 1 = 60% time (70% distance), Phase 2 = 20% time (20% distance), Phase 3 = 20% time (10% distance)
      if (t < 0.6) {
        return 0.7 * (t / 0.6);
      } else if (t < 0.8) {
        const mediumProgress = (t - 0.6) / 0.2;
        return 0.7 + 0.2 * mediumProgress;
      } else {
        const slowProgress = (t - 0.8) / 0.2;
        return 0.9 + 0.1 * (1 - Math.pow(1 - slowProgress, 4));
      }
    } else {
      // Normal (default): Phase 1 = 50% time (60% distance), Phase 2 = 30% time (30% distance), Phase 3 = 20% time (10% distance)
      if (t < 0.5) {
        return 0.6 * (t / 0.5);
      } else if (t < 0.8) {
        const mediumProgress = (t - 0.5) / 0.3;
        return 0.6 + 0.3 * mediumProgress;
      } else {
        const slowProgress = (t - 0.8) / 0.2;
        return 0.9 + 0.1 * (1 - Math.pow(1 - slowProgress, 4));
      }
    }
  };
};

export function SlotAnimation({ 
  participants, 
  winner, 
  isSpinning, 
  onSpinComplete,
  isBonusPrize,
  config
}: SlotAnimationProps) {
  const animationDuration = (config?.animationDuration ?? 6) * 1000;
  const animationSpeed = config?.animationSpeed ?? 'normal';
  const animationScrollDistance = config?.animationScrollDistance ?? 30;
  const easingFunction = useMemo(() => createEasingFunction(animationSpeed), [animationSpeed]);
  const prefersReducedMotion = useReducedMotion();
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const [scrollOffset, setScrollOffset] = useState(0);
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const [winnerPosition, setWinnerPosition] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showBounce, setShowBounce] = useState(false);

  // Build the scroll list with shuffled participants and winner at calculated position
  const buildScrollList = useCallback((participantList: Participant[], winnerParticipant: Participant | null, scrollDistance: number) => {
    if (participantList.length === 0 || !winnerParticipant) {
      return { names: [], winnerPos: 0 };
    }

    // Shuffle all participants (excluding winner to place them manually)
    const othersShuffled = participantList
      .filter(p => p.name !== winnerParticipant.name || p.email !== winnerParticipant.email)
      .sort(() => Math.random() - 0.5);

    // Use configured scroll distance (capped, not scaled with participant count)
    const minNames = animationScrollDistance;
    
    // Build the list, repeating shuffled names only if needed
    let names: string[] = [];
    while (names.length < minNames) {
      // Add shuffled participants
      for (const p of othersShuffled) {
        if (names.length < minNames) {
          names.push(p.name);
        }
      }
      // If we still need more and don't have enough participants, repeat
      if (names.length < minNames && othersShuffled.length < minNames) {
        continue;
      }
    }

    // Calculate winner position - place them near the end so scroll is substantial
    // Winner should end up in the center row when scrolling stops
    const winnerPos = names.length - CENTER_ROW - 1;
    
    // Insert winner at the calculated position
    names.splice(winnerPos, 0, winnerParticipant.name);

    return { names, winnerPos };
  }, []);

  useEffect(() => {
    if (isSpinning && participants.length > 0 && winner) {
      // Reset state
      setAnimationComplete(false);
      setShowBounce(false);
      setScrollOffset(0);

      // Build the scroll list with winner positioned
      const { names, winnerPos } = buildScrollList(participants, winner, animationScrollDistance);
      setDisplayNames(names);
      setWinnerPosition(winnerPos);

      // If user prefers reduced motion, skip animation
      if (prefersReducedMotion) {
        setScrollOffset(winnerPos * ROW_HEIGHT);
        setAnimationComplete(true);
        timeoutRef.current = window.setTimeout(() => {
          onSpinComplete();
        }, 1000);
        return;
      }

      // Calculate the target scroll position
      // When scrollOffset = winnerPos * ROW_HEIGHT, the winner will be at centeredIndex = winnerPos
      const targetOffset = winnerPos * ROW_HEIGHT;
      
      // Animation parameters - use config values
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Apply easing based on speed preset
        const easedProgress = easingFunction(progress);
        
        // Calculate current scroll position
        const currentOffset = easedProgress * targetOffset;
        setScrollOffset(currentOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Ensure we land exactly on the winner
          setScrollOffset(targetOffset);
          setShowBounce(true);
          
          // After bounce animation (300ms), mark complete and hold for 1s
          timeoutRef.current = window.setTimeout(() => {
            setAnimationComplete(true);
            timeoutRef.current = window.setTimeout(() => {
              onSpinComplete();
            }, 1000);
          }, 300);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, participants, winner, buildScrollList, onSpinComplete, prefersReducedMotion, animationDuration, easingFunction, animationScrollDistance]);

  // Show winner when animation is complete
  if (animationComplete && winner) {
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

  // The centered name index - this is the single source of truth
  // The center of the 400px container is at 200px, which is CENTER_ROW * ROW_HEIGHT + ROW_HEIGHT/2
  // A name at index N is at position N * ROW_HEIGHT from the top of the scroll content
  // For it to be centered, we need: scrollOffset = N * ROW_HEIGHT
  const centeredIndex = Math.round(scrollOffset / ROW_HEIGHT);

  // Calculate visible range with buffer
  const startIndex = Math.max(0, centeredIndex - CENTER_ROW - 2);
  const endIndex = Math.min(displayNames.length, centeredIndex + (VISIBLE_ROWS - CENTER_ROW) + 2);
  const visibleNames = displayNames.slice(startIndex, endIndex);

  // Container offset: position the scroll so centeredIndex is at the purple bar
  // Purple bar is at CENTER_ROW * ROW_HEIGHT from container top
  // We want name at centeredIndex to appear there
  const containerOffset = (CENTER_ROW * ROW_HEIGHT) - scrollOffset;

  return (
    <div className="relative h-[400px] w-full max-w-4xl mx-auto overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      
      {/* Center highlight bar */}
      <div className="absolute inset-x-0 z-5" style={{ top: CENTER_ROW * ROW_HEIGHT, height: ROW_HEIGHT }}>
        <div className="h-full bg-primary/10 border-y-2 border-primary" />
      </div>
      
      {/* Scrolling names */}
      <div 
        className="absolute inset-x-0 z-20"
        style={{ transform: `translateY(${containerOffset}px)` }}
      >
        {visibleNames.map((name, index) => {
          const actualIndex = startIndex + index;
          // Simple: is this name at the centered position?
          const isCenter = actualIndex === centeredIndex;
          
          return (
            <div
              key={`${actualIndex}-${name}`}
              className={`
                h-20 flex items-center justify-center text-4xl md:text-5xl font-bold
                transition-all duration-75
                ${isCenter ? 'text-primary scale-110' : 'text-muted-foreground/40 scale-90'}
                ${isCenter && showBounce ? 'animate-[bounce_0.3s_ease-out]' : ''}
              `}
              style={{ transform: `translateY(${actualIndex * ROW_HEIGHT}px)`, position: 'absolute', width: '100%' }}
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
