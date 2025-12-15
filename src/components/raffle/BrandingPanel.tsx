import { useRef } from 'react';
import { Image, Upload, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export type BannerSize = 'small' | 'medium' | 'large' | 'fullWidth';
export type PrizeImageSize = 'standard' | 'large' | 'extraLarge';

export interface BrandingConfig {
  eventBannerUrl: string | null;
  bannerSize: BannerSize;
  prizeImageSize: PrizeImageSize;
}

interface BrandingPanelProps {
  branding: BrandingConfig;
  onBrandingChange: (branding: BrandingConfig) => void;
}

export function BrandingPanel({ branding, onBrandingChange }: BrandingPanelProps) {
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onBrandingChange({ ...branding, eventBannerUrl: dataUrl });
      toast({
        title: 'Banner Uploaded',
        description: 'Your event banner has been added',
      });
    };
    reader.readAsDataURL(file);
  };

  const clearBanner = () => {
    onBrandingChange({ ...branding, eventBannerUrl: null });
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Event Banner</CardTitle>
        </div>
        <CardDescription>
          Add an optional event banner that replaces the company logo in presenter mode
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Event Banner (Optional)</Label>
          <div className="flex items-center gap-4">
            {branding.eventBannerUrl ? (
              <div className="relative">
                <img
                  src={branding.eventBannerUrl}
                  alt="Event banner"
                  className="h-16 max-w-[300px] object-contain rounded border bg-background p-2"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={clearBanner}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-16 w-48 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                <Image className="h-6 w-6" />
              </div>
            )}
            <div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Banner
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Replaces company logo in presenter mode
              </p>
            </div>
          </div>
        </div>

        {/* Banner Size Selector - only show when banner is uploaded */}
        {branding.eventBannerUrl && (
          <div className="space-y-2">
            <Label>Banner Display Size</Label>
            <Select
              value={branding.bannerSize}
              onValueChange={(value: BannerSize) => 
                onBrandingChange({ ...branding, bannerSize: value })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="fullWidth">Full Width</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls banner size in presenter mode
            </p>
          </div>
        )}

        {/* Prize Image Size Selector */}
        <div className="space-y-2">
          <Label>Prize Image Size</Label>
          <Select
            value={branding.prizeImageSize}
            onValueChange={(value: PrizeImageSize) => 
              onBrandingChange({ ...branding, prizeImageSize: value })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="extraLarge">Extra Large</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls prize image size in presenter mode
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
