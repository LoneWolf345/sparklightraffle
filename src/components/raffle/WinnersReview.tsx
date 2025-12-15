import { Trophy, Users, Ticket, Copy, Download, Play, FileText, Gift, TrendingDown, TrendingUp, Lock, Undo2, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Winner, Participant } from '@/types/raffle';
import { PrizeConfig, getPrizeForWinner, Prize } from '@/types/prizes';
import { PrizeDisplay } from './PrizeDisplay';
import { exportWinnersCSV, downloadFile } from '@/lib/raffle';
import { toast } from '@/hooks/use-toast';

interface WinnersReviewProps {
  winners: Winner[];
  participants: Participant[];
  prizes?: PrizeConfig | null;
  isLocked: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onLock: () => void;
  onReplay: () => void;
  onViewAudit: () => void;
  readOnly?: boolean;
}

interface WinnerStats {
  underdog: Winner | null;
  topDog: Winner | null;
  avgWinnerEntries: number;
  avgOverallEntries: number;
}

function calculateStats(winners: Winner[], participants: Participant[]): WinnerStats {
  if (winners.length === 0) {
    return { underdog: null, topDog: null, avgWinnerEntries: 0, avgOverallEntries: 0 };
  }

  const underdog = winners.reduce((min, w) => 
    w.participant.entries < min.participant.entries ? w : min
  );

  const topDog = winners.reduce((max, w) => 
    w.participant.entries > max.participant.entries ? w : max
  );

  const avgWinnerEntries = winners.reduce((sum, w) => sum + w.participant.entries, 0) / winners.length;
  const avgOverallEntries = participants.length > 0 
    ? participants.reduce((sum, p) => sum + p.entries, 0) / participants.length 
    : 0;

  return { underdog, topDog, avgWinnerEntries, avgOverallEntries };
}

function calculateOdds(entries: number, totalTickets: number): string {
  if (totalTickets === 0) return '0';
  const odds = (entries / totalTickets) * 100;
  return odds < 0.01 ? '<0.01' : odds.toFixed(2);
}

function getUniquePrizes(prizes: PrizeConfig | null, winnersCount: number): { prize: Prize; count: number }[] {
  if (!prizes) return [];
  
  const prizeMap = new Map<string, { prize: Prize; count: number }>();
  
  for (let i = 0; i < winnersCount; i++) {
    const prize = getPrizeForWinner(prizes, i);
    if (prize) {
      const key = prize.id;
      const existing = prizeMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        prizeMap.set(key, { prize, count: 1 });
      }
    }
  }
  
  return Array.from(prizeMap.values());
}

export function WinnersReview({ 
  winners, 
  participants,
  prizes,
  isLocked, 
  onUndo, 
  onRestart, 
  onLock,
  onReplay,
  onViewAudit,
  readOnly = false,
}: WinnersReviewProps) {
  const totalTickets = participants.reduce((sum, p) => sum + p.entries, 0);
  const stats = calculateStats(winners, participants);
  const uniquePrizes = getUniquePrizes(prizes, winners.length);

  const handleCopyWinners = () => {
    const text = winners
      .map(w => `${w.drawNumber}. ${w.participant.name} (${w.participant.email})`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Winners list copied to clipboard',
    });
  };

  const handleExportCSV = () => {
    const csv = exportWinnersCSV(winners, prizes);
    downloadFile(csv, `sparklight-raffle-winners-${Date.now()}.csv`, 'text/csv');
    toast({
      title: 'Exported!',
      description: prizes ? 'Winners CSV with prizes downloaded' : 'Winners CSV downloaded',
    });
  };

  if (winners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Winners
          </CardTitle>
          <CardDescription>
            No winners drawn yet. Start the raffle to select winners.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Lock Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Raffle Results</h2>
            <p className="text-muted-foreground">
              {winners.length} winner{winners.length !== 1 ? 's' : ''} drawn
            </p>
          </div>
          {isLocked && (
            <Badge variant="secondary" className="ml-2">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{participants.length.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTickets.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{winners.length}</p>
                <p className="text-sm text-muted-foreground">Winners Drawn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fun Statistics - Underdog vs Top Dog */}
      {stats.underdog && stats.topDog && stats.underdog.participant.id !== stats.topDog.participant.id && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Biggest Underdog</span>
              </CardTitle>
              <CardDescription>Beat the odds!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xl font-bold">{stats.underdog.participant.name}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-amber-500" />
                    {stats.underdog.participant.entries} {stats.underdog.participant.entries === 1 ? 'entry' : 'entries'}
                  </span>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {calculateOdds(stats.underdog.participant.entries, totalTickets)}% odds
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Won as #{stats.underdog.drawNumber}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Luckiest Winner</span>
              </CardTitle>
              <CardDescription>Most tickets = most chances!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xl font-bold">{stats.topDog.participant.name}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    {stats.topDog.participant.entries} entries
                  </span>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                    {calculateOdds(stats.topDog.participant.entries, totalTickets)}% odds
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Won as #{stats.topDog.drawNumber}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prizes Summary */}
      {uniquePrizes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Prizes Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {uniquePrizes.map(({ prize, count }) => (
                <div key={prize.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <PrizeDisplay prize={prize} size="sm" />
                  <Badge variant="secondary">×{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Winners List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              All Winners
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyWinners}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {winners.map((winner, index) => {
              const prize = getPrizeForWinner(prizes, index);
              return (
                <div 
                  key={`${winner.participant.id}-${winner.drawNumber}`}
                  className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="shrink-0">
                      #{winner.drawNumber}
                    </Badge>
                    {winner.isBonusPrize && (
                      <Badge variant="default" className="bg-accent text-accent-foreground shrink-0">
                        <Gift className="h-3 w-3 mr-1" />
                        Bonus
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold mt-2 truncate" title={winner.participant.name}>
                    {winner.participant.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate" title={winner.participant.email}>
                    {winner.participant.email}
                  </p>
                  {!readOnly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {winner.participant.entries} {winner.participant.entries === 1 ? 'entry' : 'entries'}
                    </p>
                  )}
                  {prize && (
                    <div className="mt-2 pt-2 border-t">
                      <PrizeDisplay prize={prize} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={onReplay} variant="default">
                <Play className="h-4 w-4 mr-2" />
                Replay Presentation
              </Button>
              <Button onClick={onViewAudit} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Audit Log
              </Button>
            </div>
            
            {!isLocked && !readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onUndo}
                  disabled={winners.length === 0}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo Last
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRestart}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restart
                </Button>
                <Button 
                  size="sm" 
                  onClick={onLock}
                  disabled={winners.length === 0}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Lock Draw
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
