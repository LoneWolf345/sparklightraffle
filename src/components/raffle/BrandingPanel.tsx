import { useRef } from 'react';
import { Image, Upload, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

export interface BrandingConfig {
  logoUrl: string | null;
  eventBannerUrl: string | null;
  useEventBanner: boolean;
}

interface BrandingPanelProps {
  branding: BrandingConfig;
  onBrandingChange: (branding: BrandingConfig) => void;
}

export function BrandingPanel({ branding, onBrandingChange }: BrandingPanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner'
  ) => {
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
      if (type === 'logo') {
        onBrandingChange({ ...branding, logoUrl: dataUrl });
      } else {
        onBrandingChange({ ...branding, eventBannerUrl: dataUrl });
      }
      toast({
        title: type === 'logo' ? 'Logo Uploaded' : 'Banner Uploaded',
        description: 'Your image has been added',
      });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (type: 'logo' | 'banner') => {
    if (type === 'logo') {
      onBrandingChange({ ...branding, logoUrl: null });
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      onBrandingChange({ ...branding, eventBannerUrl: null });
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Branding</CardTitle>
        </div>
        <CardDescription>
          Customize the presenter mode with your company logo or event banner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Logo */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <div className="relative">
                <img
                  src={branding.logoUrl}
                  alt="Company logo"
                  className="h-16 max-w-[200px] object-contain rounded border bg-background p-2"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => clearImage('logo')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-16 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                <Image className="h-6 w-6" />
              </div>
            )}
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'logo')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PNG or JPG, max 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Event Banner */}
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
                  onClick={() => clearImage('banner')}
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
                onChange={(e) => handleFileUpload(e, 'banner')}
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
                Replaces logo in presenter mode when enabled
              </p>
            </div>
          </div>
        </div>

        {/* Use Event Banner Toggle */}
        {branding.eventBannerUrl && (
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label>Use Event Banner</Label>
              <p className="text-sm text-muted-foreground">
                Show event banner instead of company logo
              </p>
            </div>
            <Switch
              checked={branding.useEventBanner}
              onCheckedChange={(checked) =>
                onBrandingChange({ ...branding, useEventBanner: checked })
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
