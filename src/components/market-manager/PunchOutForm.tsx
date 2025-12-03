import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, MapPin } from 'lucide-react';

interface PunchOutFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function PunchOutForm({ sessionId, onComplete }: PunchOutFormProps) {
  const [loading, setLoading] = useState(false);

  const handlePunchOut = async () => {
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const punchOutTime = new Date();

        // First, get the punch-in time to calculate working hours
        const { data: punchInData, error: punchInError } = await supabase
          .from('market_manager_punchin')
          .select('punched_at')
          .eq('session_id', sessionId)
          .order('punched_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (punchInError) {
          setLoading(false);
          toast.error('Failed to get punch-in time');
          return;
        }

        // Calculate working hours
        let workingHours = 0;
        let attendanceStatus = 'absent';
        
        if (punchInData?.punched_at) {
          const punchInTime = new Date(punchInData.punched_at);
          const diffMs = punchOutTime.getTime() - punchInTime.getTime();
          workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Hours with 2 decimal places

          // Determine attendance status
          if (workingHours >= 8) {
            attendanceStatus = 'full_day';
          } else if (workingHours >= 4) {
            attendanceStatus = 'half_day';
          } else {
            attendanceStatus = 'absent';
          }
        }

        // Insert punch-out record
        const { error: punchOutError } = await supabase.from('market_manager_punchout').insert({
          session_id: sessionId,
          gps_lat: latitude,
          gps_lng: longitude,
        });

        if (punchOutError) {
          setLoading(false);
          toast.error('Failed to punch out');
          return;
        }

        // Update session with working hours and attendance status
        const { error: updateError } = await supabase
          .from('market_manager_sessions')
          .update({
            working_hours: workingHours,
            attendance_status: attendanceStatus,
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('Failed to update attendance:', updateError);
        }

        setLoading(false);
        const statusText = attendanceStatus === 'full_day' ? 'Full Day' : 
                          attendanceStatus === 'half_day' ? 'Half Day' : 'Absent';
        toast.success(`Punched out! Working hours: ${workingHours.toFixed(2)} hrs - ${statusText}`);
        onComplete();
      },
      (error) => {
        setLoading(false);
        toast.error('Failed to get GPS location');
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Punch-Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          GPS location will be captured automatically
        </div>

        <Button onClick={handlePunchOut} disabled={loading} className="w-full">
          {loading ? 'Processing...' : 'Punch Out'}
        </Button>
      </CardContent>
    </Card>
  );
}
