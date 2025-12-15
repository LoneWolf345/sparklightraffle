import { useEffect, useCallback, useState } from 'react';
import { X, ChevronRight, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlotAnimation } from './SlotAnimation';
import { WheelAnimation } from './WheelAnimation';
import { BulkReveal } from './BulkReveal';
import { PrizeDisplay } from './PrizeDisplay';
import { Participant, Winner, RaffleConfig } from '@/types/raffle';
import { BrandingConfig } from './BrandingPanel';
import { PrizeConfig, getPrizeForWinner } from '@/types/prizes';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import confetti from 'canvas-confetti';

interface PresenterModeProps {
  participants: Participant[];
  winners: Winner[];
  config: RaffleConfig;
  branding: BrandingConfig;
  prizes: PrizeConfig | null;
  currentWinner: Participant | null;
  isDrawing: boolean;
  drawNumber: number;
  onDrawNext: () => void;
  onSpinComplete: () => void;
  onExit: () => void;
  isComplete: boolean;
  onBulkDraw?: () => void;
  bulkWinners?: Winner[];
}

export function PresenterMode({
  participants,
  winners,
  config,
  branding,
  prizes,
  currentWinner,
  isDrawing,
  drawNumber,
  onDrawNext,
  onSpinComplete,
  onExit,
  isComplete,
  onBulkDraw,
  bulkWinners,
}: PresenterModeProps) {
  const [showingResult, setShowingResult] = useState(false);
  const [bulkRevealing, setBulkRevealing] = useState(false);
  const [bulkComplete, setBulkComplete] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { playDrumroll, playWinnerReveal, playBonusPrize, playComplete } = useSoundEffects(config.soundEnabled);

  const isBonusPrize = config.bonusRoundInterval > 0 && 
    drawNumber > 0 && 
    drawNumber % config.bonusRoundInterval === 0;

  // Get the prize for the current winner position
  const currentPrize = getPrizeForWinner(prizes, drawNumber - 1);

  const triggerConfetti = useCallback(() => {
    // Skip confetti if user prefers reduced motion
    if (prefersReducedMotion) return;
    
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#f59e0b'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    if (isBonusPrize) {
      // Extra confetti for bonus prizes
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors,
        });
      }, 500);
    }
  }, [isBonusPrize, prefersReducedMotion]);

  const handleSpinComplete = useCallback(() => {
    setShowingResult(true);
    triggerConfetti();
    
    // Play appropriate sound
    if (isBonusPrize) {
      playBonusPrize();
    } else {
      playWinnerReveal();
    }
    
    onSpinComplete();
  }, [onSpinComplete, triggerConfetti, isBonusPrize, playBonusPrize, playWinnerReveal]);

  const handleDrawNext = useCallback(() => {
    setShowingResult(false);
    playDrumroll();
    onDrawNext();
  }, [onDrawNext, playDrumroll]);

  const handleBulkDraw = useCallback(() => {
    if (onBulkDraw) {
      playDrumroll();
      setBulkRevealing(true);
      onBulkDraw();
    }
  }, [onBulkDraw, playDrumroll]);

  const handleBulkRevealComplete = useCallback(() => {
    setBulkComplete(true);
    triggerConfetti();
    playComplete();
  }, [triggerConfetti, playComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (config.revealMode === 'bulk') {
          if (!bulkRevealing && !bulkComplete && onBulkDraw) {
            handleBulkDraw();
          }
        } else {
          if (!isDrawing && !isComplete && currentWinner === null) {
            handleDrawNext();
          } else if (showingResult && !isComplete) {
            handleDrawNext();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, isComplete, showingResult, handleDrawNext, onExit, currentWinner, config.revealMode, bulkRevealing, bulkComplete, handleBulkDraw, onBulkDraw]);

  // Play completion sound when all winners are drawn (sequential mode)
  useEffect(() => {
    if (config.revealMode === 'sequential' && isComplete && winners.length > 0) {
      playComplete();
    }
  }, [isComplete, winners.length, playComplete, config.revealMode]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          {branding.useEventBanner && branding.eventBannerUrl ? (
            <img
              src={branding.eventBannerUrl}
              alt="Event banner"
              className="h-12 max-w-[300px] object-contain"
            />
          ) : branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt="Company logo"
              className="h-12 max-w-[200px] object-contain"
            />
          ) : (
            <Trophy className="h-8 w-8 text-primary" />
          )}
          <div>
            <h1 className="text-2xl font-bold">Sparklight Virtual Raffle</h1>
            <p className="text-sm text-muted-foreground">
              {config.revealMode === 'bulk' 
                ? `Drawing ${config.numberOfWinners} winners`
                : `Drawing ${drawNumber} of ${config.numberOfWinners}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Winners Drawn</div>
            <div className="text-2xl font-bold">
              {config.revealMode === 'bulk' ? (bulkWinners?.length || 0) : winners.length}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onExit}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
        {/* Bulk Reveal Mode */}
        {config.revealMode === 'bulk' ? (
          bulkComplete ? (
            <div className="text-center space-y-6 animate-fade-in">
              <Trophy className="h-24 w-24 mx-auto text-primary" />
              <h2 className="text-5xl font-bold">All Winners Selected!</h2>
              <p className="text-xl text-muted-foreground">
                {bulkWinners?.length || 0} winners have been drawn
              </p>
              <Button size="lg" onClick={onExit} className="mt-8">
                View Results
              </Button>
            </div>
          ) : bulkRevealing && bulkWinners && bulkWinners.length > 0 ? (
            <BulkReveal
              winners={bulkWinners}
              prizes={prizes}
              showEmail={config.showEmail}
              onRevealComplete={handleBulkRevealComplete}
            />
          ) : (
            <div className="text-center space-y-6">
              <Users className="h-24 w-24 mx-auto text-primary opacity-80" />
              <div className="text-6xl font-bold text-primary">
                Ready to Draw All Winners!
              </div>
              <p className="text-xl text-muted-foreground">
                {config.numberOfWinners} winners will be revealed at once
              </p>
            </div>
          )
        ) : (
          /* Sequential Reveal Mode */
          isComplete ? (
            <div className="text-center space-y-6 animate-fade-in">
              <Trophy className="h-24 w-24 mx-auto text-primary" />
              <h2 className="text-5xl font-bold">All Winners Selected!</h2>
              <p className="text-xl text-muted-foreground">
                {winners.length} winners have been drawn
              </p>
              <Button size="lg" onClick={onExit} className="mt-8">
                View Results
              </Button>
            </div>
          ) : isDrawing || currentWinner ? (
            config.animationStyle === 'slot' ? (
              <SlotAnimation
                participants={participants}
                winner={currentWinner}
                isSpinning={isDrawing}
                onSpinComplete={handleSpinComplete}
                isBonusPrize={isBonusPrize}
              />
            ) : (
              <WheelAnimation
                participants={participants}
                winner={currentWinner}
                isSpinning={isDrawing}
                onSpinComplete={handleSpinComplete}
                isBonusPrize={isBonusPrize}
              />
            )
          ) : (
            <div className="text-center space-y-6">
              <div className="text-6xl font-bold text-primary">
                {drawNumber === 0 ? 'Ready to Draw!' : `Winner #${drawNumber + 1}`}
              </div>
              <p className="text-xl text-muted-foreground">
                Press Space or click the button below to reveal
              </p>
            </div>
          )
        )}

        {/* Winner Info - Sequential mode only */}
        {config.revealMode === 'sequential' && showingResult && currentWinner && (
          <div className="mt-4 text-center animate-fade-in space-y-4">
            {config.showEmail && (
              <div className="text-xl text-muted-foreground">
                {currentWinner.email}
              </div>
            )}
            {currentPrize && (
              <div className="bg-accent/20 rounded-xl py-4 px-8 inline-block">
                <PrizeDisplay prize={currentPrize} size="lg" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-6 border-t flex justify-center gap-4">
        {config.revealMode === 'bulk' ? (
          !bulkRevealing && !bulkComplete && onBulkDraw && (
            <Button 
              size="lg" 
              onClick={handleBulkDraw}
              className="text-lg px-8 py-6"
            >
              <Users className="mr-2 h-5 w-5" />
              Draw All {config.numberOfWinners} Winners
            </Button>
          )
        ) : (
          !isComplete && !isDrawing && (
            <Button 
              size="lg" 
              onClick={handleDrawNext}
              className="text-lg px-8 py-6"
            >
              {drawNumber === 0 ? (
                <>
                  Start Drawing
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              ) : showingResult ? (
                <>
                  Next Winner
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Draw Winner #{drawNumber + 1}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          )
        )}
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-4 text-sm text-muted-foreground">
        Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> to {config.revealMode === 'bulk' ? 'reveal all' : 'next'} • 
        <kbd className="px-2 py-1 bg-muted rounded text-xs ml-2">Esc</kbd> to exit
      </div>
    </div>
  );
}
