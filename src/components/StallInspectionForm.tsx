import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
}

export default function StallInspectionForm({ sessionId, marketId, marketDate, userId, onSuccess }: Props) {
  const [farmerName, setFarmerName] = useState('');
  const [stallName, setStallName] = useState('');
  const [stallNo, setStallNo] = useState('');
  const [rating, setRating] = useState('');
  const [feedback, setFeedback] = useState('');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [sessionId]);

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

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stall_inspections')
        .insert({
          session_id: sessionId,
          market_id: marketId,
          farmer_name: farmerName.trim(),
          stall_name: stallName.trim(),
          stall_no: stallNo.trim() || null,
          rating: rating ? Number(rating) : null,
          feedback: feedback.trim() || null,
        });

      if (error) throw error;

      toast.success(`Inspection submitted for ${farmerName}`);
      
      // Reset form
      setFarmerName('');
      setStallName('');
      setStallNo('');
      setRating('');
      setFeedback('');
      
      await fetchInspections();
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
      await fetchInspections();
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Farmer Name *</Label>
                <Input
                  id="farmer-name"
                  placeholder="Enter farmer name"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stall-name">Stall Name *</Label>
                <Input
                  id="stall-name"
                  placeholder="Enter stall name"
                  value={stallName}
                  onChange={(e) => setStallName(e.target.value)}
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stall-no">Stall Number</Label>
                <Input
                  id="stall-no"
                  placeholder="Enter stall number"
                  value={stallNo}
                  onChange={(e) => setStallNo(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  placeholder="Rate the stall"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Enter inspection feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={saving}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
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
                  {inspection.rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rating:</span>
                      <span className="text-sm">{'⭐'.repeat(inspection.rating)}</span>
                    </div>
                  )}
                  {inspection.feedback && (
                    <div>
                      <span className="text-sm font-medium">Feedback:</span>
                      <p className="text-sm text-muted-foreground mt-1">{inspection.feedback}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
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
