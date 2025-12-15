import { useEffect, useState, useMemo } from 'react';
import { Trophy, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Participant, Winner } from '@/types/raffle';
import { PrizeConfig, getPrizeForWinner } from '@/types/prizes';
import { PrizeDisplay } from './PrizeDisplay';

interface BulkRevealProps {
  winners: Winner[];
  prizes: PrizeConfig | null;
  showEmail: boolean;
  onRevealComplete: () => void;
}

export function BulkReveal({ winners, prizes, showEmail, onRevealComplete }: BulkRevealProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(true);

  // Stagger the reveal of each winner
  useEffect(() => {
    if (revealedCount >= winners.length) {
      setIsRevealing(false);
      onRevealComplete();
      return;
    }

    const delay = Math.max(100, 500 - (revealedCount * 10)); // Speed up as we go
    const timer = setTimeout(() => {
      setRevealedCount(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [revealedCount, winners.length, onRevealComplete]);

  // Group winners into columns for better display
  const columns = useMemo(() => {
    const cols: Winner[][] = [[], [], []];
    winners.forEach((winner, index) => {
      cols[index % 3].push(winner);
    });
    return cols;
  }, [winners]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
        <h2 className="text-4xl font-bold mb-2">
          {isRevealing ? 'Revealing Winners...' : 'All Winners!'}
        </h2>
        <p className="text-xl text-muted-foreground">
          {revealedCount} of {winners.length} revealed
        </p>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {winners.slice(0, revealedCount).map((winner, index) => {
            const prize = getPrizeForWinner(prizes, index);
            const isBonusPrize = winner.isBonusPrize;
            
            return (
              <div
                key={`${winner.participant.id}-${winner.drawNumber}`}
                className="bg-card border rounded-lg p-4 animate-scale-in"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-primary">
                        #{winner.drawNumber}
                      </span>
                      {isBonusPrize && (
                        <Badge variant="default" className="bg-accent text-accent-foreground text-xs">
                          <Gift className="h-3 w-3 mr-1" />
                          Bonus
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg truncate">
                      {winner.participant.name}
                    </h3>
                    {showEmail && (
                      <p className="text-sm text-muted-foreground truncate">
                        {winner.participant.email}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {winner.participant.entries} entries
                  </div>
                </div>
                {prize && (
                  <div className="mt-3 pt-3 border-t">
                    <PrizeDisplay prize={prize} size="sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
