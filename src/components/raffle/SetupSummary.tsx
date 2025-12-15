import { Play, Users, Ticket, Trophy, Gift, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Participant, RaffleConfig } from '@/types/raffle';
import { BrandingConfig } from '@/components/raffle/BrandingPanel';
import { PrizeConfig } from '@/types/prizes';

interface SetupSummaryProps {
  participants: Participant[];
  config: RaffleConfig;
  branding: BrandingConfig;
  prizes: PrizeConfig | null;
  onStartRaffle: () => void;
  isLocked: boolean;
}

export function SetupSummary({ 
  participants, 
  config, 
  branding, 
  prizes,
  onStartRaffle,
  isLocked
}: SetupSummaryProps) {
  const totalTickets = participants.reduce((sum, p) => sum + p.entries, 0);
  
  const animationLabels: Record<string, string> = {
    slot: 'Vertical Slot Scroll',
    wheel: 'Spin Wheel',
  };

  const revealLabels: Record<string, string> = {
    sequential: 'One at a Time',
    bulk: 'All at Once',
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Trophy className="h-16 w-16 mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-bold">Ready to Start!</h2>
        <p className="text-muted-foreground">Review your configuration and start the raffle</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Participants Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Participants</span>
                <span className="font-medium">{participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tickets</span>
                <span className="font-medium">{totalTickets.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Draw Configuration Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Draw Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Winners to Draw</span>
                <span className="font-medium">{config.numberOfWinners}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repeat Winners</span>
                <span className="font-medium">{config.allowRepeats ? 'Allowed' : 'Not Allowed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Animation</span>
                <span className="font-medium">{animationLabels[config.animationStyle]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reveal Mode</span>
                <span className="font-medium">{revealLabels[config.revealMode]}</span>
              </div>
              {config.bonusRoundInterval > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bonus Prize</span>
                  <span className="font-medium">Every {config.bonusRoundInterval} winners</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prizes Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Prizes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prizes ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prize Mode</span>
                  <span className="font-medium">
                    {prizes.mode === 'same' ? 'Same for All' : 'Sequential'}
                  </span>
                </div>
                {prizes.mode === 'same' && prizes.samePrize && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prize</span>
                    <span className="font-medium truncate max-w-[150px]">
                      {prizes.samePrize.text || 'Image only'}
                    </span>
                  </div>
                )}
                {prizes.mode === 'sequential' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prizes Configured</span>
                    <span className="font-medium">{prizes.sequentialPrizes?.length || 0}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No prizes configured</p>
            )}
          </CardContent>
        </Card>

        {/* Branding Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event Banner</span>
                <span className="font-medium">
                  {branding.eventBannerUrl ? 'Configured' : 'None'}
                </span>
              </div>
              {branding.eventBannerUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banner Size</span>
                  <span className="font-medium capitalize">{branding.bannerSize}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Button */}
      <div className="flex justify-center pt-6">
        <Button 
          size="lg" 
          onClick={onStartRaffle}
          disabled={isLocked}
          className="px-12 py-6 text-lg"
        >
          <Play className="h-6 w-6 mr-3" />
          Start Raffle
        </Button>
      </div>
    </div>
  );
}
