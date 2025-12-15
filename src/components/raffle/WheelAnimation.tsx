import { useState, useEffect, useRef } from 'react';
import { Participant } from '@/types/raffle';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface WheelAnimationProps {
  participants: Participant[];
  winner: Participant | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
  isBonusPrize?: boolean;
}

export function WheelAnimation({ 
  participants, 
  winner, 
  isSpinning, 
  onSpinComplete,
  isBonusPrize 
}: WheelAnimationProps) {
  const [rotation, setRotation] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Select up to 12 participants for wheel display
  const wheelParticipants = participants.slice(0, 12);
  const segmentAngle = 360 / wheelParticipants.length;

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
      
      const hue = (index * 30) % 360;
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
      
      const name = participant.name.length > 12 
        ? participant.name.substring(0, 12) + '...' 
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
  }, [rotation, wheelParticipants, segmentAngle]);

  useEffect(() => {
    if (isSpinning) {
      setShowWinner(false);
      
      // Skip animation if user prefers reduced motion
      if (prefersReducedMotion) {
        setTimeout(() => {
          setShowWinner(true);
          setTimeout(onSpinComplete, 300);
        }, 500);
        return;
      }
      
      let currentRotation = rotation;
      let speed = 20;
      const targetRotation = rotation + 1800 + Math.random() * 720;
      
      const spin = () => {
        if (currentRotation < targetRotation) {
          // Ease out
          const remaining = targetRotation - currentRotation;
          speed = Math.max(1, remaining / 50);
          currentRotation += speed;
          setRotation(currentRotation);
          requestAnimationFrame(spin);
        } else {
          setShowWinner(true);
          setTimeout(onSpinComplete, 500);
        }
      };
      
      spin();
    }
  }, [isSpinning, prefersReducedMotion]);

  if (showWinner && winner) {
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
    <div className="flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="max-w-full h-auto"
      />
    </div>
  );
}
