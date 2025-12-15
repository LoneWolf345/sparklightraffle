import { useState, useCallback, useEffect, useRef } from 'react';
import { Trophy, Play, Users, Ticket, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ImportPanel } from '@/components/raffle/ImportPanel';
import { ConfigPanel } from '@/components/raffle/ConfigPanel';
import { WinnersPanel } from '@/components/raffle/WinnersPanel';
import { AuditPanel } from '@/components/raffle/AuditPanel';
import { ParticipantsPanel } from '@/components/raffle/ParticipantsPanel';
import { PriorDrawsPanel } from '@/components/raffle/PriorDrawsPanel';
import { PresenterMode } from '@/components/raffle/PresenterMode';
import { Participant, Winner, RaffleConfig, ImportSummary, AuditLog } from '@/types/raffle';
import { weightedRandomSelect, generateSeed, generateDrawId, createAuditLog, calculateChecksum } from '@/lib/raffle';
import { useRafflePersistence } from '@/hooks/use-raffle-persistence';
import { toast } from '@/hooks/use-toast';

const defaultConfig: RaffleConfig = {
  numberOfWinners: 40,
  allowRepeats: false,
  animationStyle: 'slot',
  revealMode: 'sequential',
  bonusRoundInterval: 10,
  showEmail: true,
  soundEnabled: true,
};

export default function Index() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [config, setConfig] = useState<RaffleConfig>(defaultConfig);
  const [isLocked, setIsLocked] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  const [seed, setSeed] = useState<string>('');
  const [drawId, setDrawId] = useState<string>('');
  const [datasetChecksum, setDatasetChecksum] = useState<string>('');

  // Presenter mode state
  const [showPresenter, setShowPresenter] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Participant | null>(null);
  const [drawNumber, setDrawNumber] = useState(0);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplayMode, setIsReplayMode] = useState(false);

  // Dialog state
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);

  // Persistence
  const { saveDraw, loadDraw } = useRafflePersistence();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalTickets = participants.reduce((sum, p) => sum + p.entries, 0);

  // Auto-save effect
  useEffect(() => {
    if (!drawId || participants.length === 0) return;
    
    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDraw(drawId, participants, winners, config, seed, datasetChecksum, isLocked);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [drawId, participants, winners, config, seed, datasetChecksum, isLocked, saveDraw]);

  const handleLoadDraw = useCallback(async (id: string) => {
    const data = await loadDraw(id);
    if (data) {
      setParticipants(data.participants);
      setWinners(data.winners);
      setConfig(data.config);
      setSeed(data.seed);
      setDrawId(data.drawId);
      setDatasetChecksum(data.datasetChecksum);
      setIsLocked(data.isLocked);
      setDrawNumber(data.winners.length);
      setAuditLog(createAuditLog(
        data.drawId, 
        data.participants, 
        data.winners, 
        data.config, 
        data.seed
      ));
      toast({
        title: 'Draw Loaded',
        description: `Loaded draw ${data.drawId} with ${data.winners.length} winners`,
      });
    }
  }, [loadDraw]);

  const handleImport = useCallback((newParticipants: Participant[], summary: ImportSummary) => {
    setParticipants(newParticipants);
    setWinners([]);
    setIsLocked(false);
    setAuditLog(null);
    setDrawNumber(0);
    setDrawId(''); // Reset draw ID so a new one is created
    setDatasetChecksum(calculateChecksum(newParticipants));
    toast({
      title: 'Participants Imported',
      description: `${summary.totalParticipants} participants with ${summary.totalTickets.toLocaleString()} total tickets`,
    });
  }, []);

  const startPresenterMode = useCallback(() => {
    if (participants.length === 0) {
      toast({
        title: 'No Participants',
        description: 'Import participants before starting the draw',
        variant: 'destructive',
      });
      return;
    }

    if (participants.length < config.numberOfWinners && !config.allowRepeats) {
      toast({
        title: 'Not Enough Participants',
        description: `You have ${participants.length} participants but want to draw ${config.numberOfWinners} winners`,
        variant: 'destructive',
      });
      return;
    }

    // Initialize draw if not already started
    if (!drawId) {
      const newSeed = generateSeed();
      const newDrawId = generateDrawId();
      const checksum = calculateChecksum(participants);
      setSeed(newSeed);
      setDrawId(newDrawId);
      setDatasetChecksum(checksum);
      setAuditLog(createAuditLog(newDrawId, participants, [], config, newSeed));
    }
    
    setShowPresenter(true);
    setCurrentWinner(null);
    setIsReplayMode(false);
  }, [participants, config, drawId]);

  const startReplayMode = useCallback(() => {
    if (winners.length === 0) {
      toast({
        title: 'No Winners',
        description: 'No winners to replay',
        variant: 'destructive',
      });
      return;
    }
    setIsReplayMode(true);
    setReplayIndex(0);
    setDrawNumber(0);
    setCurrentWinner(null);
    setShowPresenter(true);
  }, [winners]);

  const handleDrawNext = useCallback(() => {
    // Replay mode logic
    if (isReplayMode) {
      if (replayIndex >= winners.length) return;
      setIsDrawing(true);
      setCurrentWinner(winners[replayIndex].participant);
      return;
    }

    // Normal draw logic
    if (winners.length >= config.numberOfWinners) return;

    setIsDrawing(true);
    
    const excludeEmails = config.allowRepeats 
      ? new Set<string>() 
      : new Set(winners.map(w => w.participant.email));

    const winner = weightedRandomSelect(participants, seed, excludeEmails);
    
    if (winner) {
      setCurrentWinner(winner);
    } else {
      setIsDrawing(false);
      toast({
        title: 'No More Eligible Participants',
        description: 'All participants have already won',
        variant: 'destructive',
      });
    }
  }, [participants, winners, config, seed, isReplayMode, replayIndex]);

  const handleSpinComplete = useCallback(() => {
    setIsDrawing(false);
    
    if (currentWinner) {
      // Replay mode - just advance to next winner
      if (isReplayMode) {
        setDrawNumber(replayIndex + 1);
        setReplayIndex(prev => prev + 1);
        setCurrentWinner(null);
        return;
      }

      // Normal mode - record the winner
      const newDrawNumber = drawNumber + 1;
      const isBonusPrize = config.bonusRoundInterval > 0 && 
        newDrawNumber % config.bonusRoundInterval === 0;

      const newWinner: Winner = {
        participant: currentWinner,
        drawNumber: newDrawNumber,
        timestamp: new Date(),
        isBonusPrize,
      };

      setWinners(prev => [...prev, newWinner]);
      setDrawNumber(newDrawNumber);
      
      // Update audit log
      setAuditLog(prev => prev ? {
        ...prev,
        winners: [...prev.winners, {
          drawNumber: newDrawNumber,
          name: currentWinner.name,
          email: currentWinner.email,
          entries: currentWinner.entries,
          timestamp: new Date().toISOString(),
        }],
      } : null);

      setCurrentWinner(null);
    }
  }, [currentWinner, drawNumber, config.bonusRoundInterval, isReplayMode, replayIndex]);

  const handleUndo = useCallback(() => {
    if (winners.length === 0 || isLocked) return;
    
    const lastWinner = winners[winners.length - 1];
    setWinners(prev => prev.slice(0, -1));
    setDrawNumber(prev => prev - 1);
    
    // Update audit log
    setAuditLog(prev => prev ? {
      ...prev,
      winners: prev.winners.slice(0, -1),
    } : null);

    toast({
      title: 'Winner Removed',
      description: `${lastWinner.participant.name} has been returned to the pool`,
    });
  }, [winners, isLocked]);

  const handleRestart = useCallback(() => {
    setWinners([]);
    setDrawNumber(0);
    setCurrentWinner(null);
    setAuditLog(null);
    setIsLocked(false);
    setShowRestartDialog(false);
    toast({
      title: 'Draw Restarted',
      description: 'All winners have been cleared',
    });
  }, []);

  const handleLock = useCallback(() => {
    setIsLocked(true);
    setShowLockDialog(false);
    toast({
      title: 'Draw Locked',
      description: 'The draw has been finalized and cannot be modified',
    });
  }, []);

  const exitPresenterMode = useCallback(() => {
    setShowPresenter(false);
    setIsReplayMode(false);
  }, []);

  const isComplete = isReplayMode 
    ? replayIndex >= winners.length 
    : winners.length >= config.numberOfWinners;

  if (showPresenter) {
    return (
      <PresenterMode
        participants={participants}
        winners={winners}
        config={config}
        currentWinner={currentWinner}
        isDrawing={isDrawing}
        drawNumber={drawNumber}
        onDrawNext={handleDrawNext}
        onSpinComplete={handleSpinComplete}
        onExit={exitPresenterMode}
        isComplete={isComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sparklight Virtual Raffle</h1>
                <p className="text-sm text-muted-foreground">
                  Weighted drawing for incentive programs
                </p>
              </div>
            </div>
            
            {participants.length > 0 && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{participants.length}</span>
                  <span className="text-muted-foreground">participants</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{totalTickets.toLocaleString()}</span>
                  <span className="text-muted-foreground">tickets</span>
                </div>
                <Button onClick={startPresenterMode} disabled={isLocked}>
                  <Play className="h-4 w-4 mr-2" />
                  {winners.length > 0 ? 'Continue Drawing' : 'Start Raffle'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="participants">
              Participants {participants.length > 0 && `(${participants.length})`}
            </TabsTrigger>
            <TabsTrigger value="winners">
              Winners {winners.length > 0 && `(${winners.length})`}
            </TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <ImportPanel 
                onImport={handleImport} 
                hasData={participants.length > 0} 
              />
              <ConfigPanel
                config={config}
                onConfigChange={setConfig}
                maxWinners={config.allowRepeats ? 999 : participants.length}
              />
            </div>

            {/* Quick Start Card */}
            {participants.length > 0 && winners.length === 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">Ready to Draw!</h3>
                      <p className="text-sm text-muted-foreground">
                        {participants.length} participants with {totalTickets.toLocaleString()} total tickets loaded
                      </p>
                    </div>
                    <Button size="lg" onClick={startPresenterMode}>
                      <Play className="h-5 w-5 mr-2" />
                      Enter Presenter Mode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="participants">
            <ParticipantsPanel participants={participants} />
          </TabsContent>

          <TabsContent value="winners" className="space-y-4">
            {winners.length > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={startReplayMode}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Replay Presentation
                </Button>
              </div>
            )}
            <WinnersPanel
              winners={winners}
              isLocked={isLocked}
              onUndo={handleUndo}
              onRestart={() => setShowRestartDialog(true)}
              onLock={() => setShowLockDialog(true)}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AuditPanel auditLog={auditLog} />
          </TabsContent>

          <TabsContent value="history">
            <PriorDrawsPanel onLoadDraw={handleLoadDraw} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Restart Confirmation Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Restart Draw?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all {winners.length} selected winners and reset the draw.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Restart Draw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Draw Results?</AlertDialogTitle>
            <AlertDialogDescription>
              Locking the draw will prevent any further changes to the winners list.
              The audit log will be finalized. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock}>
              Lock Draw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
