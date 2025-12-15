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

const ROW_HEIGHT = 80;
const VISIBLE_ROWS = 5;
const CENTER_ROW = 2; // 0-indexed, middle of 5 visible rows

// Exponential ease-out for dramatic slowdown
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export function SlotAnimation({ 
  participants, 
  winner, 
  isSpinning, 
  onSpinComplete,
  isBonusPrize 
}: SlotAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  const [scrollOffset, setScrollOffset] = useState(0);
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const [winnerPosition, setWinnerPosition] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Build the scroll list with shuffled participants and winner at calculated position
  const buildScrollList = useCallback((participantList: Participant[], winnerParticipant: Participant | null) => {
    if (participantList.length === 0 || !winnerParticipant) {
      return { names: [], winnerPos: 0 };
    }

    // Shuffle all participants (excluding winner to place them manually)
    const othersShuffled = participantList
      .filter(p => p.name !== winnerParticipant.name || p.email !== winnerParticipant.email)
      .sort(() => Math.random() - 0.5);

    // Determine minimum names needed for smooth scrolling
    const minNames = Math.max(60, participantList.length * 2);
    
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
      setScrollOffset(0);

      // Build the scroll list with winner positioned
      const { names, winnerPos } = buildScrollList(participants, winner);
      setDisplayNames(names);
      setWinnerPosition(winnerPos);

      // If user prefers reduced motion, skip animation
      if (prefersReducedMotion) {
        setScrollOffset(winnerPos * ROW_HEIGHT);
        setAnimationComplete(true);
        timeoutRef.current = window.setTimeout(() => {
          onSpinComplete();
        }, 500);
        return;
      }

      // Calculate the target scroll position (winner in center)
      const targetOffset = winnerPos * ROW_HEIGHT;
      
      // Animation parameters
      const animationDuration = 4000; // 4 seconds total
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Apply easing for dramatic slowdown
        const easedProgress = easeOutExpo(progress);
        
        // Calculate current scroll position
        const currentOffset = easedProgress * targetOffset;
        setScrollOffset(currentOffset);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Ensure we land exactly on the winner
          setScrollOffset(targetOffset);
          setAnimationComplete(true);
          
          // Brief pause before celebration
          timeoutRef.current = window.setTimeout(() => {
            onSpinComplete();
          }, 800);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSpinning, participants, winner, buildScrollList, onSpinComplete, prefersReducedMotion]);

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

  // Calculate which names are visible based on scroll offset
  const firstVisibleIndex = Math.floor(scrollOffset / ROW_HEIGHT);
  const offsetWithinRow = scrollOffset % ROW_HEIGHT;

  // Get visible names with some buffer
  const visibleNames = displayNames.slice(
    Math.max(0, firstVisibleIndex - 1),
    firstVisibleIndex + VISIBLE_ROWS + 2
  );

  return (
    <div className="relative h-[400px] w-full max-w-4xl mx-auto overflow-hidden">
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
      
      {/* Center highlight */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 bg-primary/10 border-y-2 border-primary z-5" />
      
      {/* Scrolling names */}
      <div 
        className="absolute inset-x-0 z-20"
        style={{ 
          transform: `translateY(${(CENTER_ROW * ROW_HEIGHT) - offsetWithinRow - ((firstVisibleIndex - Math.max(0, firstVisibleIndex - 1)) * ROW_HEIGHT)}px)`,
        }}
      >
        {visibleNames.map((name, index) => {
          const actualIndex = Math.max(0, firstVisibleIndex - 1) + index;
          const isCenter = actualIndex === Math.floor(scrollOffset / ROW_HEIGHT) + CENTER_ROW ||
                          (actualIndex === winnerPosition && animationComplete);
          
          return (
            <div
              key={`${actualIndex}-${name}`}
              className={`
                h-20 flex items-center justify-center text-4xl md:text-5xl font-bold
                transition-all duration-75
                ${isCenter ? 'text-primary scale-110' : 'text-muted-foreground/40 scale-90'}
              `}
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
