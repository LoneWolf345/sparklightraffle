import { useState, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Participant, RaffleConfig } from '@/types/raffle';
import { SlotAnimation } from './SlotAnimation';
import { WheelAnimation } from './WheelAnimation';

interface AnimationPreviewProps {
  animationStyle: 'slot' | 'wheel';
  config?: Pick<RaffleConfig, 'animationDuration' | 'animationSpeed' | 'animationScrollDistance'>;
  participants?: Participant[];
}

// Sample participants for preview
const SAMPLE_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Alex Johnson', email: 'alex.j@example.com', entries: 5 },
  { id: 'p2', name: 'Jordan Smith', email: 'jordan.s@example.com', entries: 3 },
  { id: 'p3', name: 'Taylor Brown', email: 'taylor.b@example.com', entries: 8 },
  { id: 'p4', name: 'Morgan Davis', email: 'morgan.d@example.com', entries: 2 },
  { id: 'p5', name: 'Casey Wilson', email: 'casey.w@example.com', entries: 6 },
  { id: 'p6', name: 'Riley Martinez', email: 'riley.m@example.com', entries: 4 },
  { id: 'p7', name: 'Quinn Anderson', email: 'quinn.a@example.com', entries: 7 },
  { id: 'p8', name: 'Avery Thomas', email: 'avery.t@example.com', entries: 1 },
  { id: 'p9', name: 'Parker Garcia', email: 'parker.g@example.com', entries: 9 },
  { id: 'p10', name: 'Drew Robinson', email: 'drew.r@example.com', entries: 3 },
  { id: 'p11', name: 'Jamie Lee', email: 'jamie.l@example.com', entries: 5 },
  { id: 'p12', name: 'Skyler White', email: 'skyler.w@example.com', entries: 4 },
];

export function AnimationPreview({ animationStyle, config, participants }: AnimationPreviewProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [previewWinner, setPreviewWinner] = useState<Participant | null>(null);

  // Use imported participants if available and sufficient, otherwise sample data
  const displayParticipants = participants && participants.length >= 5 
    ? participants 
    : SAMPLE_PARTICIPANTS;
  const usingImportedData = participants && participants.length >= 5;

  const handlePreview = useCallback(() => {
    // Pick a random winner from display participants
    const randomWinner = displayParticipants[Math.floor(Math.random() * displayParticipants.length)];
    setPreviewWinner(randomWinner);
    setIsSpinning(true);
  }, [displayParticipants]);

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false);
  }, []);

  const handleReset = useCallback(() => {
    setPreviewWinner(null);
    setIsSpinning(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Animation Preview</p>
          {usingImportedData ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Using imported data
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Sample data
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {previewWinner && !isSpinning && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={handlePreview}
            disabled={isSpinning}
          >
            <Play className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-background overflow-hidden min-h-[300px] flex items-center justify-center">
        {!isSpinning && !previewWinner ? (
          <p className="text-muted-foreground text-sm">
            Click Preview to see the {animationStyle === 'slot' ? 'Vertical Slot Scroll' : 'Spin Wheel'} animation
          </p>
        ) : animationStyle === 'slot' ? (
          <div className="w-full">
            <SlotAnimation
              participants={displayParticipants}
              winner={previewWinner}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              config={config}
            />
          </div>
        ) : (
          <WheelAnimation
            participants={displayParticipants}
            winner={previewWinner}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
          />
        )}
      </div>
    </div>
  );
}
