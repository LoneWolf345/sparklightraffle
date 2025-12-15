import { useState, useRef } from 'react';
import { Gift, Plus, Trash2, Upload, Image as ImageIcon, Type, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PrizeConfig, Prize, PrizeDisplayType, PrizeMode, getDefaultPrizeConfig } from '@/types/prizes';

interface PrizesPanelProps {
  prizes: PrizeConfig | null;
  onPrizesChange: (prizes: PrizeConfig | null) => void;
  numberOfWinners: number;
}

export function PrizesPanel({ prizes, onPrizesChange, numberOfWinners }: PrizesPanelProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | 'same' | null>(null);

  const config = prizes || getDefaultPrizeConfig();

  const handleModeChange = (mode: PrizeMode) => {
    onPrizesChange({
      ...config,
      mode,
    });
  };

  const handleSamePrizeChange = (updates: Partial<Prize>) => {
    onPrizesChange({
      ...config,
      samePrize: {
        ...config.samePrize!,
        ...updates,
      },
    });
  };

  const handleSequentialPrizeChange = (index: number, updates: Partial<Prize>) => {
    const prizes = [...(config.sequentialPrizes || [])];
    prizes[index] = { ...prizes[index], ...updates };
    onPrizesChange({
      ...config,
      sequentialPrizes: prizes,
    });
  };

  const addSequentialPrize = () => {
    const prizes = [...(config.sequentialPrizes || [])];
    prizes.push({
      id: crypto.randomUUID(),
      text: '',
      displayType: 'text',
    });
    onPrizesChange({
      ...config,
      sequentialPrizes: prizes,
    });
  };

  const removeSequentialPrize = (index: number) => {
    const prizes = [...(config.sequentialPrizes || [])];
    prizes.splice(index, 1);
    onPrizesChange({
      ...config,
      sequentialPrizes: prizes,
    });
  };

  const uploadImage = async (file: File, targetIndex: number | 'same') => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadingIndex(targetIndex);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `prizes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('prize-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('prize-images')
        .getPublicUrl(filePath);

      if (targetIndex === 'same') {
        handleSamePrizeChange({ imageUrl: publicUrl });
      } else {
        handleSequentialPrizeChange(targetIndex, { imageUrl: publicUrl });
      }

      toast({
        title: 'Image uploaded',
        description: 'Prize image has been uploaded',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, targetIndex: number | 'same') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file, targetIndex);
    }
    e.target.value = '';
  };

  const triggerFileInput = (targetIndex: number | 'same') => {
    setUploadingIndex(targetIndex);
    fileInputRef.current?.click();
  };

  const renderPrizeEditor = (prize: Prize, onChange: (updates: Partial<Prize>) => void, index: number | 'same') => (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label>Display Type</Label>
          <Select
            value={prize.displayType}
            onValueChange={(value: PrizeDisplayType) => onChange({ displayType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text Only
                </div>
              </SelectItem>
              <SelectItem value="image">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Image Only
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Text & Image
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {typeof index === 'number' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeSequentialPrize(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(prize.displayType === 'text' || prize.displayType === 'both') && (
        <div>
          <Label>Prize Text</Label>
          <Input
            value={prize.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="e.g., $250 Gift Card"
          />
        </div>
      )}

      {(prize.displayType === 'image' || prize.displayType === 'both') && (
        <div>
          <Label>Prize Image</Label>
          <div className="flex items-center gap-4 mt-2">
            {prize.imageUrl ? (
              <div className="relative">
                <img
                  src={prize.imageUrl}
                  alt="Prize"
                  className="h-20 w-20 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => onChange({ imageUrl: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => triggerFileInput(index)}
                disabled={uploading && uploadingIndex === index}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading && uploadingIndex === index ? 'Uploading...' : 'Upload Image'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Prize Configuration
        </CardTitle>
        <CardDescription>
          Configure prizes to display when winners are revealed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e, uploadingIndex!)}
        />

        <RadioGroup
          value={config.mode}
          onValueChange={(value: PrizeMode) => handleModeChange(value)}
          className="grid grid-cols-2 gap-4"
        >
          <Label
            htmlFor="same"
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              config.mode === 'same' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <RadioGroupItem value="same" id="same" />
            <div>
              <div className="font-medium">Same Prize</div>
              <div className="text-sm text-muted-foreground">Every winner gets the same prize</div>
            </div>
          </Label>
          <Label
            htmlFor="sequential"
            className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              config.mode === 'sequential' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <RadioGroupItem value="sequential" id="sequential" />
            <div>
              <div className="font-medium">Sequential Prizes</div>
              <div className="text-sm text-muted-foreground">Different prize for each position</div>
            </div>
          </Label>
        </RadioGroup>

        <Separator />

        {config.mode === 'same' && config.samePrize && (
          <div>
            <Label className="text-base font-medium mb-4 block">Prize for All Winners</Label>
            {renderPrizeEditor(config.samePrize, handleSamePrizeChange, 'same')}
          </div>
        )}

        {config.mode === 'sequential' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Prizes by Position</Label>
              <Button variant="outline" size="sm" onClick={addSequentialPrize}>
                <Plus className="h-4 w-4 mr-1" />
                Add Prize
              </Button>
            </div>

            {(config.sequentialPrizes || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No prizes configured yet</p>
                <p className="text-sm">Click "Add Prize" to add prizes for each winner position</p>
              </div>
            ) : (
              <div className="space-y-4">
                {config.sequentialPrizes!.map((prize, index) => (
                  <div key={prize.id}>
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : index === 2 ? '3rd Place' : `${index + 1}th Place`}
                      {index === config.sequentialPrizes!.length - 1 && index < numberOfWinners - 1 && (
                        <span className="text-xs ml-2">(applies to remaining winners)</span>
                      )}
                    </Label>
                    {renderPrizeEditor(
                      prize,
                      (updates) => handleSequentialPrizeChange(index, updates),
                      index
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
