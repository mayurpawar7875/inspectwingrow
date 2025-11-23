import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const inspectionSchema = z.object({
  farmer_name: z.string().trim().min(1, 'Farmer name is required').max(200, 'Farmer name must be less than 200 characters'),
});

interface Props {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

interface InspectionItem {
  label: string;
  key: string;
}

// Simplified interface matching actual database schema
interface Inspection {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string | null;
  rating: number | null;
  feedback: string | null;
  session_id: string;
  market_id: string;
  created_at: string;
  updated_at: string;
}

const INSPECTION_ITEMS: InspectionItem[] = [
  { label: 'Tent', key: 'has_tent' },
  { label: 'Table', key: 'has_table' },
  { label: 'Rate Board', key: 'has_rateboard' },
  { label: 'Flex', key: 'has_flex' },
  { label: 'Light', key: 'has_light' },
  { label: 'Green Net', key: 'has_green_net' },
  { label: 'Mat', key: 'has_mat' },
  { label: 'Digital Weighing Machine', key: 'has_digital_weighing_machine' },
  { label: 'Display', key: 'has_display' },
  { label: 'Apron', key: 'has_apron' },
  { label: 'Cap', key: 'has_cap' },
];

export default function StallInspectionForm({ sessionId, marketId, marketDate, userId, onSuccess }: Props) {
  const [farmerName, setFarmerName] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [sessionId, marketId]);

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('stall_inspections')
        .select('*')
        .eq('session_id', sessionId)
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (key: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      inspectionSchema.parse({ farmer_name: farmerName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (!farmerName.trim()) {
      toast.error('Please enter farmer name');
      return;
    }

    setSaving(true);

    try {
      const stallName = Object.entries(checkedItems)
        .filter(([_, checked]) => checked)
        .map(([key]) => INSPECTION_ITEMS.find(item => item.key === key)?.label)
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('stall_inspections')
        .insert({
          session_id: sessionId,
          market_id: marketId,
          farmer_name: farmerName.trim(),
          stall_name: stallName || 'Not specified',
          rating: null,
          feedback: null,
        });

      if (error) throw error;

      toast.success('Inspection recorded successfully');
      setFarmerName('');
      setCheckedItems({});
      fetchInspections();
      onSuccess?.();
    } catch (error: any) {
      console.error('Inspection error:', error);
      toast.error(error.message || 'Failed to record inspection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inspectionId: string) => {
    try {
      const { error } = await supabase
        .from('stall_inspections')
        .delete()
        .eq('id', inspectionId);

      if (error) throw error;

      toast.success('Inspection deleted');
      fetchInspections();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete inspection');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stall Inspection</CardTitle>
        <CardDescription>Record stall inspections with checklist items</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Farmer Name */}
          <div className="space-y-2">
            <Label htmlFor="farmer">Farmer Name</Label>
            <Input
              id="farmer"
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              placeholder="Enter farmer name"
              disabled={saving}
            />
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Inspection Checklist</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INSPECTION_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.key}
                    checked={checkedItems[item.key] || false}
                    onCheckedChange={(checked) => handleCheckChange(item.key, !!checked)}
                    disabled={saving}
                  />
                  <Label htmlFor={item.key} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Record Inspection
              </>
            )}
          </Button>
        </form>

        {/* Previous Inspections */}
        {loading ? (
          <div className="mt-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : inspections.length > 0 && (
          <div className="mt-8">
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold mb-4">Today's Inspections</h3>
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <Card key={inspection.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium">{inspection.farmer_name}</p>
                        <p className="text-sm text-muted-foreground">{inspection.stall_name}</p>
                        {inspection.stall_no && (
                          <p className="text-xs text-muted-foreground">Stall #{inspection.stall_no}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(inspection.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })} IST
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(inspection.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
