import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { getSignedUrl } from '@/lib/storageHelpers';

interface LocationVisit {
  id: string;
  employee_id: string;
  selfie_url: string;
  latitude: number;
  longitude: number;
  location_name: string;
  location_type: string;
  occupied_flats: number | null;
  nearby_population: string | null;
  nearest_local_mandi: string | null;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function LocationVisitsWidget() {
  const [visits, setVisits] = useState<LocationVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<LocationVisit | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVisits();
  }, []);

  useEffect(() => {
    if (selectedVisit) {
      loadSelfie(selectedVisit.selfie_url);
    }
  }, [selectedVisit]);

  const loadSelfie = async (path: string) => {
    const url = await getSignedUrl('location-visit-selfies', path);
    setSelfieUrl(url);
  };

  const fetchVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('market_location_visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisits(data || []);

      // Fetch employee names from both profiles and employees tables
      const employeeIds = [...new Set(data?.map(v => v.employee_id) || [])];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", employeeIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, full_name")
        .in("id", employeeIds);

      if (employeesError) {
        console.error("Error fetching employees:", employeesError);
      }

      const nameMap: Record<string, string> = {};
      
      // Prioritize profiles table
      if (profiles) {
        profiles.forEach(p => {
          if (p.full_name) {
            nameMap[p.id] = p.full_name;
          }
        });
      }
      
      // Fallback to employees table
      if (employees) {
        employees.forEach(e => {
          if (!nameMap[e.id] && e.full_name) {
            nameMap[e.id] = e.full_name;
          }
        });
      }
      
      setEmployeeNames(nameMap);
    } catch (error: any) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to load location visits');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (visitId: string, action: 'approved' | 'rejected') => {
    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('market_location_visits')
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', visitId);

      if (error) throw error;

      toast.success(`Location visit ${action}`);
      setSelectedVisit(null);
      setReviewNotes('');
      setSelfieUrl(null);
      await fetchVisits();
    } catch (error: any) {
      console.error('Error updating visit:', error);
      toast.error('Failed to update location visit');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = visits.filter(v => v.status === 'pending').length;

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Location Visits</span>
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} Pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visits.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No location visits yet</p>
            ) : (
              visits.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedVisit(visit)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{visit.location_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {employeeNames[visit.employee_id] || 'Unknown Employee'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {visit.location_type === 'residential_complex' ? 'Residential Complex' : 'Open Space'}
                    </div>
                  </div>
                  <Badge variant={
                    visit.status === 'pending' ? 'secondary' :
                    visit.status === 'approved' ? 'default' : 'destructive'
                  }>
                    {visit.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={() => {
        setSelectedVisit(null);
        setReviewNotes('');
        setSelfieUrl(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Location Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              {/* Selfie */}
              {selfieUrl && (
                <div>
                  <Label>Selfie</Label>
                  <img src={selfieUrl} alt="Location selfie" className="w-full max-w-md rounded-lg border mt-2" />
                </div>
              )}

              {/* Employee */}
              <div>
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Employee
                </Label>
                <p className="text-sm mt-1">{employeeNames[selectedVisit.employee_id] || 'Unknown Employee'}</p>
              </div>

              {/* GPS Coordinates */}
              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  GPS Coordinates
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Lat:</span> {selectedVisit.latitude}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Lng:</span> {selectedVisit.longitude}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${selectedVisit.latitude},${selectedVisit.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-1 inline-block"
                >
                  View on Google Maps
                </a>
              </div>

              {/* Location Details */}
              <div>
                <Label>Location Name</Label>
                <p className="text-sm mt-1">{selectedVisit.location_name}</p>
              </div>

              <div>
                <Label>Location Type</Label>
                <p className="text-sm mt-1">
                  {selectedVisit.location_type === 'residential_complex' ? 'Residential Complex' : 'Open Space'}
                </p>
              </div>

              {selectedVisit.location_type === 'residential_complex' && (
                <div>
                  <Label>Occupied Flats</Label>
                  <p className="text-sm mt-1">{selectedVisit.occupied_flats}</p>
                </div>
              )}

              {selectedVisit.location_type === 'open_space' && (
                <>
                  <div>
                    <Label>Nearby Population</Label>
                    <p className="text-sm mt-1">{selectedVisit.nearby_population}</p>
                  </div>
                  <div>
                    <Label>Nearest Local Mandi</Label>
                    <p className="text-sm mt-1">{selectedVisit.nearest_local_mandi}</p>
                  </div>
                </>
              )}

              {/* Metadata */}
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Submitted
                </Label>
                <p className="text-sm mt-1">{new Date(selectedVisit.created_at).toLocaleString()}</p>
              </div>

              <div>
                <Label>Status</Label>
                <Badge className="mt-1" variant={
                  selectedVisit.status === 'pending' ? 'secondary' :
                  selectedVisit.status === 'approved' ? 'default' : 'destructive'
                }>
                  {selectedVisit.status}
                </Badge>
              </div>

              {/* Review Section */}
              {selectedVisit.status === 'pending' && (
                <>
                  <div>
                    <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                    <Textarea
                      id="reviewNotes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this location visit..."
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAction(selectedVisit.id, 'approved')}
                      disabled={actionLoading}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleAction(selectedVisit.id, 'rejected')}
                      disabled={actionLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {selectedVisit.review_notes && (
                <div>
                  <Label>Review Notes</Label>
                  <p className="text-sm mt-1">{selectedVisit.review_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
