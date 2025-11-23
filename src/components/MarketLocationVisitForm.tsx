import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';

interface LocationVisit {
  id: string;
  location_name: string;
  location_type: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function MarketLocationVisitForm() {
  const [loading, setLoading] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState<'residential_complex' | 'open_space' | ''>('');
  const [occupiedFlats, setOccupiedFlats] = useState('');
  const [nearbyPopulation, setNearbyPopulation] = useState('');
  const [nearestLocalMandi, setNearestLocalMandi] = useState('');
  const [myVisits, setMyVisits] = useState<LocationVisit[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-capture GPS on mount
    captureGPS();
    // Fetch employee's location visits
    fetchMyVisits();
  }, []);

  const fetchMyVisits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('market_location_visits')
        .select('id, location_name, location_type, status, created_at, reviewed_at, review_notes')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          toast.success('GPS coordinates captured');
        },
        (error) => {
          console.error('GPS Error:', error);
          toast.error('Failed to capture GPS. Please enable location services.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearPhoto = () => {
    setSelfieFile(null);
    setPreviewUrl(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selfieFile) {
      toast.error('Please take a selfie');
      return;
    }

    if (latitude === null || longitude === null) {
      toast.error('GPS coordinates not available. Please enable location services.');
      return;
    }

    if (!locationName.trim()) {
      toast.error('Please enter location name');
      return;
    }

    if (!locationType) {
      toast.error('Please select location type');
      return;
    }

    if (locationType === 'residential_complex' && !occupiedFlats.trim()) {
      toast.error('Please enter occupied flats');
      return;
    }

    if (locationType === 'open_space' && (!nearbyPopulation.trim() || !nearestLocalMandi.trim())) {
      toast.error('Please fill all open space fields');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload selfie to storage
      const fileExt = selfieFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('location-visit-selfies')
        .upload(fileName, selfieFile);

      if (uploadError) throw uploadError;

      // Save to database
      const { error: insertError } = await supabase
        .from('market_location_visits')
        .insert({
          employee_id: user.id,
          selfie_url: uploadData.path,
          latitude,
          longitude,
          location_name: locationName,
          location_type: locationType,
          occupied_flats: locationType === 'residential_complex' ? parseInt(occupiedFlats) : null,
          nearby_population: locationType === 'open_space' ? nearbyPopulation : null,
          nearest_local_mandi: locationType === 'open_space' ? nearestLocalMandi : null,
        });

      if (insertError) throw insertError;

      toast.success('Location visit submitted successfully');
      
      // Reset form
      setSelfieFile(null);
      setPreviewUrl(null);
      setLocationName('');
      setLocationType('');
      setOccupiedFlats('');
      setNearbyPopulation('');
      setNearestLocalMandi('');
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      captureGPS(); // Recapture GPS for next entry
      fetchMyVisits(); // Refresh the list
    } catch (error: any) {
      console.error('Error submitting location visit:', error);
      toast.error('Failed to submit location visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Location Visit</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selfie Upload */}
          <div className="space-y-2">
            <Label>Selfie *</Label>
            {previewUrl ? (
              <div className="space-y-2">
                <img 
                  src={previewUrl} 
                  alt="Selfie preview" 
                  className="w-full max-w-xs rounded-lg border"
                />
                <Button type="button" variant="outline" onClick={clearPhoto}>
                  Clear Photo
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Selfie
              </Button>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* GPS Coordinates */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              GPS Coordinates
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={latitude !== null ? latitude.toFixed(6) : 'Loading...'}
                disabled
                placeholder="Latitude"
              />
              <Input
                value={longitude !== null ? longitude.toFixed(6) : 'Loading...'}
                disabled
                placeholder="Longitude"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={captureGPS}
            >
              Refresh GPS
            </Button>
          </div>

          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="locationName">Location Name *</Label>
            <Input
              id="locationName"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Enter location name"
              required
            />
          </div>

          {/* Location Type */}
          <div className="space-y-2">
            <Label htmlFor="locationType">Location Type *</Label>
            <Select value={locationType} onValueChange={(value: any) => setLocationType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential_complex">Residential Complex</SelectItem>
                <SelectItem value="open_space">Open Space</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Fields */}
          {locationType === 'residential_complex' && (
            <div className="space-y-2">
              <Label htmlFor="occupiedFlats">Occupied Flats *</Label>
              <Input
                id="occupiedFlats"
                type="number"
                value={occupiedFlats}
                onChange={(e) => setOccupiedFlats(e.target.value)}
                placeholder="Enter number of occupied flats"
                required
              />
            </div>
          )}

          {locationType === 'open_space' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nearbyPopulation">Nearby Population *</Label>
                <Input
                  id="nearbyPopulation"
                  value={nearbyPopulation}
                  onChange={(e) => setNearbyPopulation(e.target.value)}
                  placeholder="Enter nearby population estimate"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nearestLocalMandi">Nearest Local Mandi *</Label>
                <Input
                  id="nearestLocalMandi"
                  value={nearestLocalMandi}
                  onChange={(e) => setNearestLocalMandi(e.target.value)}
                  placeholder="Enter nearest local mandi"
                  required
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Location Visit'}
          </Button>
        </form>

        {/* My Submissions Section */}
        {myVisits.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">My Submitted Requests</h3>
              <div className="space-y-3">
                {myVisits.map((visit) => (
                  <Card key={visit.id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{visit.location_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {visit.location_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(visit.created_at).toLocaleDateString('en-IN')}
                        </p>
                        {visit.review_notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Notes:</span> {visit.review_notes}
                          </p>
                        )}
                      </div>
                      <div>
                        {visit.status === 'pending' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {visit.status === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {visit.status === 'rejected' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
