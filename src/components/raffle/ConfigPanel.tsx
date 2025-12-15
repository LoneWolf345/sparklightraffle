import { Settings, Repeat, Monitor, Volume2, VolumeX, Gift, Timer, Gauge } from 'lucide-react';
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
        </div>

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
