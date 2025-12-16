import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Participant, RaffleConfig } from '@/types/raffle';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface WheelAnimationProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
  isBonusPrize?: boolean;
  config?: Pick<RaffleConfig, 'animationDuration' | 'animationSpeed' | 'wheelSegments' | 'wheelRotations' | 'winnerDwellTime'>;
}

// Get friction coefficient based on speed preset
function getFrictionCoefficient(speed: 'slow' | 'normal' | 'fast'): number {
  switch (speed) {
    case 'slow': return 2.5; // More dramatic coast-down
    case 'fast': return 4.0; // Quicker stop
    default: return 3.0;    // Balanced
  }
}

export const WheelAnimation = React.forwardRef<HTMLDivElement, WheelAnimationProps>(
  function WheelAnimation({ 
    participants, 
    winner, 
    isSpinning, 
    onSpinComplete,
    isBonusPrize,
    config
  }, ref) {
    const [rotation, setRotation] = useState(0);
    const [phase, setPhase] = useState<'idle' | 'spinning' | 'dwelling' | 'complete'>('idle');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const startRotationRef = useRef(0);
    const targetRotationRef = useRef(0);
    const prefersReducedMotion = useReducedMotion();
    
    // Config with defaults
    const segments = config?.wheelSegments ?? 12;
    const rotations = config?.wheelRotations ?? 4;
    const duration = (config?.animationDuration ?? 6) * 1000; // Convert to ms
    const dwellTime = (config?.winnerDwellTime ?? 1.5) * 1000; // Convert to ms
    const speed = config?.animationSpeed ?? 'normal';
    
    // Select participants for wheel display (up to configured segments)
    const wheelParticipants = participants.slice(0, Math.min(segments, participants.length));
    const segmentAngle = 360 / wheelParticipants.length;

    // Calculate target rotation to land on winner (called once at animation start)
    const calculateTargetRotation = useCallback((currentRotation: number) => {
      if (!winner) return currentRotation + rotations * 360;
      
      const winnerIndex = wheelParticipants.findIndex(p => p.id === winner.id);
      if (winnerIndex === -1) {
        // Winner not on wheel, just spin a random amount
        return currentRotation + rotations * 360 + Math.random() * 360;
      }
      
      // Calculate the angle where the winner segment's center is drawn
      // Segments are drawn starting at -90 degrees (top), so segment center is at:
      // (index + 0.5) * segmentAngle - 90 + rotation
      // For the pointer at 0 degrees (right side), we need:
      // (winnerIndex + 0.5) * segmentAngle - 90 + targetRotation ≡ 0 (mod 360)
      // So: targetRotation = 90 - (winnerIndex + 0.5) * segmentAngle
      
      const winnerAngle = (winnerIndex + 0.5) * segmentAngle;
      const targetAngle = 90 - winnerAngle;
      
      // Normalize current rotation to 0-360 range
      const currentAngleNormalized = ((currentRotation % 360) + 360) % 360;
      
      // Calculate how much additional rotation needed to reach target
      let additionalRotation = targetAngle - currentAngleNormalized;
      
      // Ensure we always spin forward (positive direction)
      while (additionalRotation <= 0) {
        additionalRotation += 360;
      }
      
      // Add base rotations plus the precise additional rotation
      const baseRotation = rotations * 360;
      
      // Small variance within the segment for visual interest (centered so winner stays in segment)
      const variance = (Math.random() - 0.5) * 0.3 * segmentAngle;
      
      return currentRotation + baseRotation + additionalRotation + variance;
    }, [winner, wheelParticipants, rotations, segmentAngle]);

    // Draw the wheel
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw segments
      wheelParticipants.forEach((participant, index) => {
        const startAngle = (index * segmentAngle - 90 + rotation) * Math.PI / 180;
        const endAngle = ((index + 1) * segmentAngle - 90 + rotation) * Math.PI / 180;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        const hue = (index * (360 / wheelParticipants.length)) % 360;
        ctx.fillStyle = `hsl(${hue}, 70%, ${index % 2 === 0 ? '55%' : '45%'})`;
        ctx.fill();
        ctx.strokeStyle = 'hsl(var(--background))';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((startAngle + endAngle) / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        
        const maxLen = segments <= 8 ? 14 : 10;
        const name = participant.name.length > maxLen 
          ? participant.name.substring(0, maxLen) + '...' 
          : participant.name;
        ctx.fillText(name, radius - 20, 5);
        ctx.restore();
      });

      // Center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.fill();
      ctx.strokeStyle = 'hsl(var(--primary-foreground))';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pointer
      ctx.beginPath();
      ctx.moveTo(centerX + radius + 10, centerY);
      ctx.lineTo(centerX + radius + 30, centerY - 15);
      ctx.lineTo(centerX + radius + 30, centerY + 15);
      ctx.closePath();
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.fill();
    }, [rotation, wheelParticipants, segmentAngle, segments]);

    // Animation effect
    useEffect(() => {
      if (!isSpinning) return;
      
      // Reset state when starting new spin
      setPhase('spinning');
      
      // Skip animation if user prefers reduced motion
      if (prefersReducedMotion) {
        setPhase('complete');
        setTimeout(onSpinComplete, 300);
        return;
      }

      // Calculate target rotation once at the start of animation
      startRotationRef.current = rotation;
      targetRotationRef.current = calculateTargetRotation(rotation);
      const totalRotation = targetRotationRef.current - startRotationRef.current;
      const friction = getFrictionCoefficient(speed);
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Exponential decay easing for realistic friction
        // This creates a "coasting to a stop" effect
        const easedProgress = 1 - Math.pow(1 - progress, friction);
        
        const currentRotation = startRotationRef.current + totalRotation * easedProgress;
        setRotation(currentRotation);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Spinning complete, start dwell phase
          setPhase('dwelling');
          setTimeout(() => {
            setPhase('complete');
            onSpinComplete();
          }, dwellTime);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSpinning, prefersReducedMotion, duration, dwellTime, speed, onSpinComplete]);

    // Show winner when complete
    if (phase === 'complete' && winner) {
      return (
        <div ref={ref} className="flex flex-col items-center justify-center py-8">
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

    // Show dwelling state (winner highlighted on wheel)
    if (phase === 'dwelling' && winner) {
      return (
        <div ref={ref} className="flex flex-col items-center justify-center">
          <div className="relative">
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={500} 
              className="max-w-full h-auto"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-background/90 px-6 py-3 rounded-lg shadow-lg border animate-scale-in">
                <p className="text-2xl font-bold text-primary">{winner.name}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={500} 
          className="max-w-full h-auto"
        />
      </div>
    );
  }
);
