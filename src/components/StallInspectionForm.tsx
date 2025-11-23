import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

interface StallConfirmation {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string;
}

interface Inspection {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string | null;
  has_table: boolean;
  has_tent: boolean;
  has_mat: boolean;
  has_flex: boolean;
  has_cap: boolean;
  has_apron: boolean;
  has_display: boolean;
  has_rateboard: boolean;
  session_id: string;
  market_id: string;
  created_at: string;
}

export default function StallInspectionForm({ sessionId, marketId, marketDate, userId, onSuccess }: Props) {
  const [stallConfirmations, setStallConfirmations] = useState<StallConfirmation[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [selectedStall, setSelectedStall] = useState<StallConfirmation | null>(null);
  const [hasTable, setHasTable] = useState(false);
  const [hasTent, setHasTent] = useState(false);
  const [hasMat, setHasMat] = useState(false);
  const [hasFlex, setHasFlex] = useState(false);
  const [hasCap, setHasCap] = useState(false);
  const [hasApron, setHasApron] = useState(false);
  const [hasDisplay, setHasDisplay] = useState(false);
  const [hasRateboard, setHasRateboard] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [sessionId, marketId, marketDate]);

  const fetchData = async () => {
    try {
      // Fetch stall confirmations
      const { data: confirmations, error: confirmError } = await supabase
        .from('stall_confirmations')
        .select('*')
        .eq('market_id', marketId)
        .eq('market_date', marketDate)
        .order('farmer_name', { ascending: true });

      if (confirmError) throw confirmError;
      setStallConfirmations(confirmations || []);

      // Fetch inspections
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('stall_inspections')
        .select('*')
        .eq('session_id', sessionId)
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (inspectionError) throw inspectionError;
      setInspections(inspectionData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFarmerSelect = (confirmationId: string) => {
    setSelectedFarmerId(confirmationId);
    const stall = stallConfirmations.find(s => s.id === confirmationId);
    setSelectedStall(stall || null);
    // Reset checkboxes
    setHasTable(false);
    setHasTent(false);
    setHasMat(false);
    setHasFlex(false);
    setHasCap(false);
    setHasApron(false);
    setHasDisplay(false);
    setHasRateboard(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStall) {
      toast.error('Please select a farmer');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stall_inspections')
        .insert({
          session_id: sessionId,
          market_id: marketId,
          farmer_name: selectedStall.farmer_name,
          stall_name: selectedStall.stall_name,
          stall_no: selectedStall.stall_no,
          has_table: hasTable,
          has_tent: hasTent,
          has_mat: hasMat,
          has_flex: hasFlex,
          has_cap: hasCap,
          has_apron: hasApron,
          has_display: hasDisplay,
          has_rateboard: hasRateboard,
        });

      if (error) throw error;

      toast.success(`Inspection submitted for ${selectedStall.farmer_name}`);
      
      // Reset form
      setSelectedFarmerId('');
      setSelectedStall(null);
      setHasTable(false);
      setHasTent(false);
      setHasMat(false);
      setHasFlex(false);
      setHasCap(false);
      setHasApron(false);
      setHasDisplay(false);
      setHasRateboard(false);
      
      await fetchData();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving inspection:', error);
      toast.error('Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, farmerName: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stall_inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`Inspection deleted for ${farmerName}`);
      await fetchData();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      toast.error('Failed to delete inspection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stall Inspection</CardTitle>
          <CardDescription>Inspect and record details for each stall</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="farmer-select">Select Farmer *</Label>
              <Select value={selectedFarmerId} onValueChange={handleFarmerSelect} disabled={saving}>
                <SelectTrigger id="farmer-select">
                  <SelectValue placeholder="Choose a farmer from stall confirmations" />
                </SelectTrigger>
                <SelectContent>
                  {stallConfirmations.map((stall) => (
                    <SelectItem key={stall.id} value={stall.id}>
                      {stall.farmer_name} - {stall.stall_name} (#{stall.stall_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStall && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Check Items Available</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="table"
                        checked={hasTable}
                        onCheckedChange={(checked) => setHasTable(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="table" className="cursor-pointer">Table</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tent"
                        checked={hasTent}
                        onCheckedChange={(checked) => setHasTent(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="tent" className="cursor-pointer">Tent</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mat"
                        checked={hasMat}
                        onCheckedChange={(checked) => setHasMat(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="mat" className="cursor-pointer">Mat</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="flex"
                        checked={hasFlex}
                        onCheckedChange={(checked) => setHasFlex(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="flex" className="cursor-pointer">Flex</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cap"
                        checked={hasCap}
                        onCheckedChange={(checked) => setHasCap(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="cap" className="cursor-pointer">Cap</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="apron"
                        checked={hasApron}
                        onCheckedChange={(checked) => setHasApron(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="apron" className="cursor-pointer">Apron</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="display"
                        checked={hasDisplay}
                        onCheckedChange={(checked) => setHasDisplay(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="display" className="cursor-pointer">Display</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rateboard"
                        checked={hasRateboard}
                        onCheckedChange={(checked) => setHasRateboard(checked as boolean)}
                        disabled={saving}
                      />
                      <Label htmlFor="rateboard" className="cursor-pointer">Rateboard</Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" disabled={saving || !selectedStall}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4 animate-spin" />
                  Submit Inspection
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of Inspections */}
      {inspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Inspections ({inspections.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inspections.map((inspection) => (
              <div key={inspection.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{inspection.farmer_name}</h4>
                    <p className="text-sm text-muted-foreground">{inspection.stall_name}</p>
                    {inspection.stall_no && (
                      <p className="text-xs text-muted-foreground">Stall #{inspection.stall_no}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(inspection.id, inspection.farmer_name)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {inspection.has_table && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Table</span>}
                    {inspection.has_tent && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Tent</span>}
                    {inspection.has_mat && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Mat</span>}
                    {inspection.has_flex && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Flex</span>}
                    {inspection.has_cap && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Cap</span>}
                    {inspection.has_apron && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Apron</span>}
                    {inspection.has_display && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Display</span>}
                    {inspection.has_rateboard && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">✓ Rateboard</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(inspection.created_at).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
