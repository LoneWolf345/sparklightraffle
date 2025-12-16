import { Settings, Repeat, Monitor, Volume2, VolumeX, Gift, Timer, Gauge, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RaffleConfig, Participant } from '@/types/raffle';
import { AnimationPreview } from './AnimationPreview';

interface ConfigPanelProps {
  config: RaffleConfig;
  onConfigChange: (config: RaffleConfig) => void;
  maxWinners: number;
  participants?: Participant[];
}

export function ConfigPanel({ config, onConfigChange, maxWinners, participants }: ConfigPanelProps) {
  const updateConfig = (updates: Partial<RaffleConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Draw Configuration
        </CardTitle>
        <CardDescription>
          Customize how the raffle will run
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Number of Winners */}
        <div className="space-y-2">
          <Label htmlFor="num-winners">Number of Winners</Label>
          <Input
            id="num-winners"
            type="number"
            min={1}
            max={maxWinners}
            value={config.numberOfWinners}
            onChange={(e) => updateConfig({ 
              numberOfWinners: Math.min(Math.max(1, parseInt(e.target.value) || 1), maxWinners) 
            })}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Max: {maxWinners} (total participants)
          </p>
        </div>

        {/* Allow Repeats */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Allow Repeat Winners
            </Label>
            <p className="text-xs text-muted-foreground">
              If disabled, winners are removed from the pool after selection
            </p>
          </div>
          <Switch
            checked={config.allowRepeats}
            onCheckedChange={(checked) => updateConfig({ allowRepeats: checked })}
          />
        </div>

        {/* Animation Style */}
        <div className="space-y-2">
          <Label>Animation Style</Label>
          <Select
            value={config.animationStyle}
            onValueChange={(value: 'slot' | 'wheel') => updateConfig({ animationStyle: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slot">Vertical Slot Scroll</SelectItem>
              <SelectItem value="wheel">Spin Wheel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Animation Timing */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
          <p className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Animation Timing
          </p>
          
          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Duration</Label>
              <span className="text-sm font-medium text-primary">{config.animationDuration}s</span>
            </div>
            <Slider
              value={[config.animationDuration]}
              onValueChange={([value]) => updateConfig({ animationDuration: value })}
              min={4}
              max={12}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Total time for the spinning animation (4-12 seconds)
            </p>
          </div>

          {/* Speed Preset */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4" />
              Speed Preset
            </Label>
            <Select
              value={config.animationSpeed}
              onValueChange={(value: 'slow' | 'normal' | 'fast') => updateConfig({ animationSpeed: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow & Dramatic</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Fast Start</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.animationSpeed === 'slow' && 'Slower overall, longer readable phases'}
              {config.animationSpeed === 'normal' && 'Balanced speed with gradual slowdown'}
              {config.animationSpeed === 'fast' && 'Quick initial burst, gradual slowdown'}
            </p>
          </div>

          {/* Scroll Distance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Scroll Distance</Label>
              <span className="text-sm font-medium text-primary">{config.animationScrollDistance} names</span>
            </div>
            <Slider
              value={[config.animationScrollDistance]}
              onValueChange={([value]) => updateConfig({ animationScrollDistance: value })}
              min={15}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {config.animationScrollDistance <= 20 && 'Short - More readable, slower scroll'}
              {config.animationScrollDistance > 20 && config.animationScrollDistance <= 35 && 'Medium - Balanced scroll speed'}
              {config.animationScrollDistance > 35 && 'Long - More dramatic, faster scroll'}
            </p>
          </div>
        </div>

        {/* Wheel Settings - only show when wheel animation is selected */}
        {config.animationStyle === 'wheel' && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm font-medium flex items-center gap-2">
              <Circle className="h-4 w-4" />
              Wheel Settings
            </p>

            {/* Wheel Segments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Wheel Segments</Label>
                <span className="text-sm font-medium text-primary">{config.wheelSegments} names</span>
              </div>
              <Slider
                value={[config.wheelSegments]}
                onValueChange={([value]) => updateConfig({ wheelSegments: value })}
                min={6}
                max={16}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {config.wheelSegments <= 8 && 'Fewer segments - larger slices, easier to read'}
                {config.wheelSegments > 8 && config.wheelSegments <= 12 && 'Balanced - good visibility'}
                {config.wheelSegments > 12 && 'More names visible - smaller slices'}
              </p>
            </div>

            {/* Wheel Rotations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Wheel Rotations</Label>
                <span className="text-sm font-medium text-primary">{config.wheelRotations} turns</span>
              </div>
              <Slider
                value={[config.wheelRotations]}
                onValueChange={([value]) => updateConfig({ wheelRotations: value })}
                min={2}
                max={8}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {config.wheelRotations <= 3 && 'Quick spin - faster reveal'}
                {config.wheelRotations > 3 && config.wheelRotations <= 5 && 'Medium spin - balanced excitement'}
                {config.wheelRotations > 5 && 'Long spin - maximum suspense'}
              </p>
            </div>

            {/* Winner Dwell Time */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Winner Pause Time</Label>
                <span className="text-sm font-medium text-primary">{config.winnerDwellTime}s</span>
              </div>
              <Slider
                value={[config.winnerDwellTime]}
                onValueChange={([value]) => updateConfig({ winnerDwellTime: value })}
                min={0.5}
                max={3}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How long to pause on the winner before showing full-screen reveal
              </p>
            </div>
          </div>
        )}

        {/* Animation Preview */}
        <AnimationPreview animationStyle={config.animationStyle} config={config} participants={participants} />

        {/* Reveal Mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Reveal Mode
          </Label>
          <Select
            value={config.revealMode}
            onValueChange={(value: 'sequential' | 'bulk') => updateConfig({ revealMode: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequential">Sequential (One at a time)</SelectItem>
              <SelectItem value="bulk">Bulk (Show all at end)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bonus Round */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Bonus Prize Interval
          </Label>
          <Select
            value={config.bonusRoundInterval.toString()}
            onValueChange={(value) => updateConfig({ bonusRoundInterval: parseInt(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Disabled</SelectItem>
              <SelectItem value="5">Every 5th Winner</SelectItem>
              <SelectItem value="10">Every 10th Winner</SelectItem>
              <SelectItem value="20">Every 20th Winner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Presentation Options */}
        <div className="pt-4 border-t space-y-4">
          <p className="text-sm font-medium">Presentation Options</p>
          
          <div className="flex items-center justify-between">
            <Label>Show Email in Presenter Mode</Label>
            <Switch
              checked={config.showEmail}
              onCheckedChange={(checked) => updateConfig({ showEmail: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Show Team in Presenter Mode</Label>
            <Switch
              checked={config.showTeam}
              onCheckedChange={(checked) => updateConfig({ showTeam: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {config.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound Effects
            </Label>
            <Switch
              checked={config.soundEnabled}
              onCheckedChange={(checked) => updateConfig({ soundEnabled: checked })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
