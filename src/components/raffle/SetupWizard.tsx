import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WizardProgress, WizardStep } from './WizardProgress';
import { ImportPanel } from './ImportPanel';
import { ParticipantsPanel } from './ParticipantsPanel';
import { PrizesPanel } from './PrizesPanel';
import { BrandingPanel, BrandingConfig } from './BrandingPanel';
import { ConfigPanel } from './ConfigPanel';
import { SetupSummary } from './SetupSummary';
import { Participant, RaffleConfig, ImportSummary, Winner } from '@/types/raffle';
import { PrizeConfig } from '@/types/prizes';

const SETUP_STEPS: WizardStep[] = [
  { id: 'import', title: 'Import', description: 'Upload participants' },
  { id: 'review', title: 'Review', description: 'Verify data' },
  { id: 'prizes', title: 'Prizes', description: 'Configure prizes' },
  { id: 'branding', title: 'Branding', description: 'Event banner' },
  { id: 'config', title: 'Configure', description: 'Draw settings' },
];

interface SetupWizardProps {
  participants: Participant[];
  winners: Winner[];
  config: RaffleConfig;
  branding: BrandingConfig;
  prizes: PrizeConfig | null;
  isLocked: boolean;
  totalTickets: number;
  onImport: (participants: Participant[], summary: ImportSummary) => void;
  onConfigChange: (config: RaffleConfig) => void;
  onBrandingChange: (branding: BrandingConfig) => void;
  onPrizesChange: (prizes: PrizeConfig | null) => void;
  onStartRaffle: () => void;
  onReplayPresentation: () => void;
  onSwitchToWinners: () => void;
}

export function SetupWizard({
  participants,
  winners,
  config,
  branding,
  prizes,
  isLocked,
  totalTickets,
  onImport,
  onConfigChange,
  onBrandingChange,
  onPrizesChange,
  onStartRaffle,
  onReplayPresentation,
  onSwitchToWinners,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Auto-advance from import step when participants are loaded
  useEffect(() => {
    if (participants.length > 0 && currentStep === 0) {
      setCompletedSteps(prev => new Set([...prev, 0]));
    }
  }, [participants.length, currentStep]);

  const canProceed = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Import - must have participants
        return participants.length > 0;
      case 1: // Review - can always proceed
      case 2: // Prizes - optional
      case 3: // Branding - optional
      case 4: // Config - can always proceed
        return true;
      default:
        return false;
    }
  }, [participants.length]);

  const handleNext = useCallback(() => {
    if (currentStep < SETUP_STEPS.length) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    if (index <= currentStep || completedSteps.has(index)) {
      setCurrentStep(index);
    }
  }, [currentStep, completedSteps]);

  const isSummaryStep = currentStep === SETUP_STEPS.length;

  // Show post-raffle state if winners exist
  if (winners.length > 0) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-xl">
                {isLocked ? 'Raffle Complete' : 'Raffle In Progress'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {winners.length} of {config.numberOfWinners} winners drawn
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <Button variant="outline" onClick={onReplayPresentation}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Replay Presentation
              </Button>
              <Button onClick={onSwitchToWinners}>
                Review Winners
              </Button>
              {!isLocked && winners.length < config.numberOfWinners && (
                <Button onClick={onStartRaffle}>
                  <Play className="h-4 w-4 mr-2" />
                  Continue Drawing
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress Bar */}
      {!isSummaryStep && (
        <WizardProgress
          steps={SETUP_STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
        />
      )}

      {/* Navigation Buttons - Now directly below progress */}
      {!isSummaryStep && (
        <div className="flex justify-between items-center py-3 px-4 bg-muted/30 rounded-lg border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground font-medium">
            Step {currentStep + 1} of {SETUP_STEPS.length}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed(currentStep)}
          >
            {currentStep === SETUP_STEPS.length - 1 ? (
              <>
                Review & Start
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Back button on summary - also at top */}
      {isSummaryStep && (
        <div className="flex justify-center py-3 px-4 bg-muted/30 rounded-lg border">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Configuration
          </Button>
        </div>
      )}

      {/* Step Content */}
      <div>
        {currentStep === 0 && (
          <ImportPanel
            onImport={(p, s) => {
              onImport(p, s);
              // Auto-advance after successful import
              setTimeout(() => {
                setCompletedSteps(prev => new Set([...prev, 0]));
                setCurrentStep(1);
              }, 500);
            }}
            hasData={participants.length > 0}
          />
        )}

        {currentStep === 1 && (
          <ParticipantsPanel participants={participants} />
        )}

        {currentStep === 2 && (
          <PrizesPanel
            prizes={prizes}
            onPrizesChange={onPrizesChange}
            numberOfWinners={config.numberOfWinners}
          />
        )}

        {currentStep === 3 && (
          <BrandingPanel
            branding={branding}
            onBrandingChange={onBrandingChange}
          />
        )}

        {currentStep === 4 && (
          <ConfigPanel
            config={config}
            onConfigChange={onConfigChange}
            maxWinners={config.allowRepeats ? 999 : participants.length}
            participants={participants}
          />
        )}

        {isSummaryStep && (
          <SetupSummary
            participants={participants}
            config={config}
            branding={branding}
            prizes={prizes}
            onStartRaffle={onStartRaffle}
            isLocked={isLocked}
          />
        )}
      </div>
    </div>
  );
}
