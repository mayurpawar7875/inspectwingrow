import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Camera, MapPin, CheckCircle2, Package, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { format, startOfWeek, isWednesday, getDay } from 'date-fns';
import { getGPSPosition } from '@/lib/gpsHelper';

interface Asset {
  id: string;
  asset_name: string;
  total_quantity: number;
  available_quantity: number;
}

interface InspectionItem {
  asset_id: string;
  asset_name: string;
  actual_quantity: number;
  available_quantity: number | null;
}

export function BMSAssetInspectionTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentWeekInspection, setCurrentWeekInspection] = useState<any>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getCurrentWeekStart = () => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 }); // Monday
  };

  const isOnTime = () => {
    return isWednesday(new Date());
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('asset_inventory')
        .select('id, asset_name, total_quantity, available_quantity')
        .order('asset_name');

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);

      // Initialize inspection items
      const items: InspectionItem[] = (assetsData || []).map(asset => ({
        asset_id: asset.id,
        asset_name: asset.asset_name,
        actual_quantity: asset.total_quantity,
        available_quantity: null
      }));
      setInspectionItems(items);

      // Check for existing inspection this week
      const weekStart = format(getCurrentWeekStart(), 'yyyy-MM-dd');
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('bms_asset_inspections')
        .select(`
          *,
          bms_asset_inspection_items (
            asset_id,
            actual_quantity,
            available_quantity
          )
        `)
        .eq('user_id', user.id)
        .eq('inspection_week', weekStart)
        .maybeSingle();

      if (inspectionError && inspectionError.code !== 'PGRST116') throw inspectionError;
      setCurrentWeekInspection(inspectionData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('Unable to access camera');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setSelfieUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      const position = await getGPSPosition();
      setLocation({
        lat: position.latitude,
        lng: position.longitude
      });
      toast.success('Location captured');
    } catch (error: any) {
      toast.error(error.message || 'Unable to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const updateAvailableQuantity = (assetId: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    setInspectionItems(prev => 
      prev.map(item => 
        item.asset_id === assetId 
          ? { ...item, available_quantity: numValue }
          : item
      )
    );
  };

  const selectedAsset = inspectionItems.find(item => item.asset_id === selectedAssetId);
  const filledAssetsCount = inspectionItems.filter(item => item.available_quantity !== null).length;

  const allAssetsFilled = inspectionItems.every(item => item.available_quantity !== null);

  const handleSubmit = async () => {
    if (!user || !capturedBlob || !location || !allAssetsFilled) {
      toast.error('Please complete all fields, capture selfie and location');
      return;
    }

    setSubmitting(true);
    try {
      const weekStart = format(getCurrentWeekStart(), 'yyyy-MM-dd');
      const fileName = `bms-inspection/${user.id}/${weekStart}-${Date.now()}.jpg`;

      // Upload selfie
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, capturedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('employee-media')
        .getPublicUrl(fileName);

      // Create inspection record
      const { data: inspectionResult, error: insertError } = await supabase
        .from('bms_asset_inspections')
        .insert({
          user_id: user.id,
          inspection_week: weekStart,
          inspection_status: isOnTime() ? 'on_time' : 'late',
          gps_lat: location.lat,
          gps_lng: location.lng,
          selfie_url: urlData.publicUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert inspection items
      const itemsToInsert = inspectionItems.map(item => ({
        inspection_id: inspectionResult.id,
        asset_id: item.asset_id,
        actual_quantity: item.actual_quantity,
        available_quantity: item.available_quantity as number
      }));

      const { error: itemsError } = await supabase
        .from('bms_asset_inspection_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success('Inspection submitted successfully!');
      fetchData();
      setSelfieUrl(null);
      setCapturedBlob(null);
      setLocation(null);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already submitted this week
  if (currentWeekInspection) {
    const items = currentWeekInspection.bms_asset_inspection_items || [];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Inspection Submitted
          </CardTitle>
          <CardDescription>
            Week of {format(getCurrentWeekStart(), 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={currentWeekInspection.inspection_status === 'on_time' ? 'default' : 'destructive'}>
              {currentWeekInspection.inspection_status === 'on_time' ? 'On Time' : 'Late'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Submitted on {format(new Date(currentWeekInspection.inspection_date), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {currentWeekInspection.selfie_url && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Inspection Selfie</p>
              <img 
                src={currentWeekInspection.selfie_url} 
                alt="Inspection selfie" 
                className="w-32 h-32 rounded-lg object-cover"
              />
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Asset Summary</p>
            <div className="space-y-2">
              {items.map((item: any) => {
                const asset = assets.find(a => a.id === item.asset_id);
                return (
                  <div key={item.asset_id} className="flex justify-between text-sm p-2 bg-muted rounded">
                    <span>{asset?.asset_name || 'Unknown Asset'}</span>
                    <span>
                      {item.available_quantity} / {item.actual_quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Inspection form
  const dayOfWeek = getDay(new Date());
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Weekly Asset Inspection
        </CardTitle>
        <CardDescription>
          Week of {format(getCurrentWeekStart(), 'MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Banner */}
        {isOnTime() ? (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">
              Today is Wednesday - submit on time!
            </span>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Today is {dayName} - submission will be marked as Late
            </span>
          </div>
        )}

        {/* Asset Dropdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Select Asset</Label>
            <Badge variant="outline">{filledAssetsCount} / {inspectionItems.length} filled</Badge>
          </div>
          
          <Select
            value={selectedAssetId || ''}
            onValueChange={setSelectedAssetId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an asset to inspect" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {inspectionItems.map((item) => (
                <SelectItem key={item.asset_id} value={item.asset_id}>
                  <div className="flex items-center gap-2">
                    <span>{item.asset_name}</span>
                    {item.available_quantity !== null && (
                      <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Asset Details */}
        {selectedAsset && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex justify-between items-center">
              <span className="font-medium">{selectedAsset.asset_name}</span>
              <Badge variant="secondary">Actual: {selectedAsset.actual_quantity}</Badge>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Available Quantity
              </Label>
              <Select
                value={selectedAsset.available_quantity?.toString() ?? ''}
                onValueChange={(value) => updateAvailableQuantity(selectedAsset.asset_id, value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select available quantity" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {Array.from({ length: selectedAsset.actual_quantity + 1 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Camera Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Selfie</Label>
          
          {showCamera ? (
            <div className="space-y-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-sm rounded-lg bg-black"
              />
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selfieUrl ? (
            <div className="space-y-3">
              <img src={selfieUrl} alt="Captured selfie" className="w-32 h-32 rounded-lg object-cover" />
              <Button variant="outline" size="sm" onClick={() => {
                setSelfieUrl(null);
                setCapturedBlob(null);
              }}>
                Retake
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={startCamera} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Take Selfie
            </Button>
          )}
        </div>

        {/* Location Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Location</Label>
          {location ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                <MapPin className="h-3 w-3 mr-1" />
                Location Captured
              </Badge>
              <Button variant="ghost" size="sm" onClick={getLocation}>
                Refresh
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={getLocation} disabled={gettingLocation} className="w-full">
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Get Location
            </Button>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!capturedBlob || !location || !allAssetsFilled || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit Inspection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
