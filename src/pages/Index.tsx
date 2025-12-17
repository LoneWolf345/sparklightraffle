import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Play, Users, Ticket, AlertTriangle, LogIn, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { WinnersReview } from '@/components/raffle/WinnersReview';
import { AuditPanel } from '@/components/raffle/AuditPanel';
import { PriorDrawsPanel } from '@/components/raffle/PriorDrawsPanel';
import { PresenterMode } from '@/components/raffle/PresenterMode';
import { BrandingConfig } from '@/components/raffle/BrandingPanel';
import { AdminPanel } from '@/components/raffle/AdminPanel';
import { SetupWizard } from '@/components/raffle/SetupWizard';
import { Participant, Winner, RaffleConfig, ImportSummary, AuditLog } from '@/types/raffle';
import { weightedRandomSelect, generateSeed, generateDrawId, createAuditLog, calculateChecksum } from '@/lib/raffle';
import { useRafflePersistence } from '@/hooks/use-raffle-persistence';
import { useAuth } from '@/hooks/use-auth';
import { useCompanyBranding } from '@/hooks/use-company-branding';
import { maskWinners, maskParticipants } from '@/lib/privacy';
import { toast } from '@/hooks/use-toast';
import { PrizeConfig, getDefaultPrizeConfig } from '@/types/prizes';

const defaultConfig: RaffleConfig = {
  numberOfWinners: 5,
  allowRepeats: false,
  animationStyle: 'slot',
  revealMode: 'sequential',
  bonusRoundInterval: 0,
  showEmail: true,
  showTeam: false,
  soundEnabled: true,
  animationDuration: 6,
  animationSpeed: 'normal',
  animationScrollDistance: 30,
  wheelSegments: 12,
  wheelRotations: 4,
  winnerDwellTime: 1.5,
};

export default function Index() {
  const navigate = useNavigate();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const { logoUrl: companyLogoUrl } = useCompanyBranding();
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [config, setConfig] = useState<RaffleConfig>(defaultConfig);
  const [isLocked, setIsLocked] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null);
  const [seed, setSeed] = useState<string>('');
  const [drawId, setDrawId] = useState<string>('');
  const [datasetChecksum, setDatasetChecksum] = useState<string>('');
  const [drawName, setDrawName] = useState<string>('');

  // Presenter mode state
  const [showPresenter, setShowPresenter] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Participant | null>(null);
  const [drawNumber, setDrawNumber] = useState(0);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [bulkWinners, setBulkWinners] = useState<Winner[]>([]);
  const isReplayModeRef = useRef(false);

  // Tab state for controlled tabs
  const [activeTab, setActiveTab] = useState('setup');

  // Dialog state
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);

  // Branding state (event banner per-draw with display settings)
  const [branding, setBranding] = useState<BrandingConfig>({
    eventBannerUrl: null,
    bannerSize: 'large',
    prizeImageSize: 'large',
  });

  // Prizes state
  const [prizes, setPrizes] = useState<PrizeConfig | null>(getDefaultPrizeConfig());

  // Persistence
  const { saveDraw, loadDraw } = useRafflePersistence();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Privacy-filtered data for non-authenticated users
  const displayWinners = useMemo(() => {
    if (isAuthenticated) return winners;
    return maskWinners(winners, true); // Hide entries for guests
  }, [winners, isAuthenticated]);

  const displayParticipants = useMemo(() => {
    if (isAuthenticated) return participants;
    return maskParticipants(participants, true); // Hide entries for guests
  }, [participants, isAuthenticated]);

  const totalTickets = participants.reduce((sum, p) => sum + p.entries, 0);

  // Auto-save effect - only for admins
  useEffect(() => {
    if (!isAdmin || !drawId || participants.length === 0) return;
    
    // Debounce saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDraw(drawId, participants, winners, config, seed, datasetChecksum, isLocked, branding, prizes, drawName, user?.email);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isAdmin, drawId, participants, winners, config, seed, datasetChecksum, isLocked, branding, prizes, drawName, user?.email, saveDraw]);

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
      setBranding(data.branding);
      setPrizes(data.prizes);
      setDrawName(data.drawName || '');
      setDrawNumber(data.winners.length);
      setAuditLog(createAuditLog(
        data.drawId, 
        data.participants, 
        data.winners, 
        data.config, 
        data.seed,
        data.drawName,
        data.organizerEmail
      ));
      toast({
        title: 'Draw Loaded',
        description: `Loaded draw ${data.drawName || data.drawId} with ${data.winners.length} winners`,
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
    setDrawName(''); // Reset draw name
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
      setAuditLog(createAuditLog(newDrawId, participants, [], config, newSeed, drawName, user?.email));
    }
    
    setShowPresenter(true);
    setCurrentWinner(null);
    setIsDrawing(false);
    setIsReplayMode(false);
  }, [participants, config, drawId, drawName, user?.email]);

  const startReplayMode = useCallback(() => {
    if (winners.length === 0) {
      toast({
        title: 'No Winners',
        description: 'No winners to replay',
        variant: 'destructive',
      });
      return;
    }
    isReplayModeRef.current = true;
    setIsReplayMode(true);
    setReplayIndex(0);
    setDrawNumber(0);
    setCurrentWinner(null);
    setIsDrawing(false);
    setShowPresenter(true);
  }, [winners]);

  const handleDrawNext = useCallback(() => {
    // Clear previous winner before starting new draw
    setCurrentWinner(null);
    
    // Replay mode logic - use ref to avoid stale closure
    if (isReplayModeRef.current) {
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
    // Don't clear currentWinner here - let it persist until next draw
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

  // Start a new draw with the same participants, config, branding, and prizes
  const handleNewDrawSameSettings = useCallback(() => {
    const newSeed = generateSeed();
    const newDrawId = generateDrawId();
    setSeed(newSeed);
    setDrawId(newDrawId);
    setDrawName('');
    setWinners([]);
    setDrawNumber(0);
    setCurrentWinner(null);
    setAuditLog(null);
    setIsLocked(false);
    toast({
      title: 'Ready for New Draw',
      description: 'Same participants and settings, fresh random seed',
    });
  }, []);

  // Start completely fresh - reset everything
  const handleNewDrawFresh = useCallback(() => {
    setParticipants([]);
    setWinners([]);
    setConfig(defaultConfig);
    setBranding({
      eventBannerUrl: null,
      bannerSize: 'large',
      prizeImageSize: 'large',
    });
    setPrizes(getDefaultPrizeConfig());
    setSeed('');
    setDrawId('');
    setDrawName('');
    setDatasetChecksum('');
    setDrawNumber(0);
    setCurrentWinner(null);
    setAuditLog(null);
    setIsLocked(false);
    toast({
      title: 'Starting Fresh',
      description: 'Ready to import new participants',
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
    isReplayModeRef.current = false;
    setIsDrawing(false);
    setCurrentWinner(null);
    // Transfer bulk winners to main winners if applicable
    if (bulkWinners.length > 0) {
      setWinners(bulkWinners);
      setDrawNumber(bulkWinners.length);
      // Update audit log with bulk winners
      if (drawId) {
        setAuditLog(createAuditLog(drawId, participants, bulkWinners, config, seed, drawName, user?.email));
      }
      setBulkWinners([]);
    }
  }, [bulkWinners, drawId, participants, config, seed, drawName, user?.email]);

  const handleBulkDraw = useCallback(() => {
    if (participants.length === 0) return;

    const drawnWinners: Winner[] = [];
    const excludeEmails = new Set<string>();
    const numToDraw = Math.min(config.numberOfWinners, config.allowRepeats ? config.numberOfWinners : participants.length);

    for (let i = 0; i < numToDraw; i++) {
      const winner = weightedRandomSelect(
        participants, 
        seed, 
        config.allowRepeats ? new Set<string>() : excludeEmails
      );
      
      if (!winner) break;

      const isBonusPrize = config.bonusRoundInterval > 0 && 
        (i + 1) % config.bonusRoundInterval === 0;

      drawnWinners.push({
        participant: winner,
        drawNumber: i + 1,
        timestamp: new Date(),
        isBonusPrize,
      });

      if (!config.allowRepeats) {
        excludeEmails.add(winner.email);
      }
    }

    setBulkWinners(drawnWinners);
  }, [participants, config, seed]);

  const isComplete = isReplayMode 
    ? replayIndex >= winners.length 
    : winners.length >= config.numberOfWinners;

  if (showPresenter) {
    return (
      <PresenterMode
        participants={participants}
        winners={winners}
        config={config}
        branding={branding}
        companyLogoUrl={companyLogoUrl}
        prizes={prizes}
        currentWinner={currentWinner}
        isDrawing={isDrawing}
        drawNumber={drawNumber}
        onDrawNext={handleDrawNext}
        onSpinComplete={handleSpinComplete}
        onExit={exitPresenterMode}
        isComplete={isComplete}
        onBulkDraw={handleBulkDraw}
        bulkWinners={bulkWinners}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {companyLogoUrl ? (
                <div className="flex flex-col items-start">
                  <img
                    src={companyLogoUrl}
                    alt="Company logo"
                    className="h-10 max-w-[180px] object-contain"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Weighted drawing for incentive programs
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-2 bg-primary rounded-lg">
                    <Trophy className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Sparklight Virtual Raffle</h1>
                    <p className="text-sm text-muted-foreground">
                      Weighted drawing for incentive programs
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auth status and controls */}
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {user?.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              )}
              
              {/* Raffle stats and start button - only show stats to authenticated, start to admin */}
              {participants.length > 0 && (
                <div className="flex items-center gap-6">
                  {isAuthenticated && (
                    <>
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
                    </>
                  )}
                  {isAdmin && (
                    <Button onClick={startPresenterMode} disabled={isLocked}>
                      <Play className="h-4 w-4 mr-2" />
                      {winners.length > 0 ? 'Continue Drawing' : 'Start Raffle'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Admin view with all tabs */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="winners">
                Winners {winners.length > 0 && `(${winners.length})`}
              </TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="admin">
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup">
              <SetupWizard
                participants={participants}
                winners={winners}
                config={config}
                branding={branding}
                prizes={prizes}
                isLocked={isLocked}
                totalTickets={totalTickets}
                drawName={drawName}
                onImport={handleImport}
                onConfigChange={setConfig}
                onBrandingChange={setBranding}
                onPrizesChange={setPrizes}
                onDrawNameChange={setDrawName}
                onStartRaffle={startPresenterMode}
                onReplayPresentation={startReplayMode}
                onSwitchToWinners={() => setActiveTab('winners')}
                onNewDrawSameSettings={handleNewDrawSameSettings}
                onNewDrawFresh={handleNewDrawFresh}
              />
            </TabsContent>

            <TabsContent value="winners" className="space-y-4">
              <WinnersReview
                winners={winners}
                participants={participants}
                prizes={prizes}
                isLocked={isLocked}
                drawName={drawName}
                onUndo={handleUndo}
                onRestart={() => setShowRestartDialog(true)}
                onLock={() => setShowLockDialog(true)}
                onReplay={startReplayMode}
                onViewAudit={() => setActiveTab('audit')}
              />
            </TabsContent>

            <TabsContent value="audit">
              <AuditPanel auditLog={auditLog} />
            </TabsContent>

            <TabsContent value="history">
              <PriorDrawsPanel onLoadDraw={handleLoadDraw} />
            </TabsContent>

            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-admin view: winners and history only */
          <Tabs defaultValue="winners" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="winners">
                Winners {displayWinners.length > 0 && `(${displayWinners.length})`}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="winners" className="space-y-4">
              <WinnersReview
                winners={displayWinners}
                participants={displayParticipants}
                prizes={prizes}
                isLocked={true}
                onUndo={() => {}}
                onRestart={() => {}}
                onLock={() => {}}
                onReplay={isAuthenticated ? startReplayMode : () => {}}
                onViewAudit={() => {}}
                readOnly
              />
              {!isAuthenticated && displayWinners.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Winners Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Check back when the raffle has been drawn
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      Sign in with your work email to see full winner details
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <PriorDrawsPanel onLoadDraw={handleLoadDraw} />
            </TabsContent>
          </Tabs>
        )}
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
