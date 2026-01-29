import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, MapPin, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getGPSPosition } from '@/lib/gpsHelper';

export function BMSAttendanceTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [captureTime, setCaptureTime] = useState<Date | null>(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getISTDateString = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchTodayAttendance();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const today = getISTDateString();
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('attendance_date', today)
        .eq('role', 'bms_executive')
        .maybeSingle();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
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

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    setCapturing(true);
    try {
      // Capture GPS location simultaneously
      const position = await getGPSPosition();
      setLocation({
        lat: position.latitude,
        lng: position.longitude
      });
      setCaptureTime(new Date());

      // Capture photo
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
      toast.success('Selfie & location captured');
    } catch (error: any) {
      toast.error(error.message || 'Failed to capture location');
    } finally {
      setCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const handleCheckIn = async () => {
    if (!user || !capturedBlob || !location) {
      toast.error('Please capture selfie first');
      return;
    }

    setSubmitting(true);
    try {
      const today = getISTDateString();
      const fileName = `bms-attendance/${user.id}/${today}-${Date.now()}.jpg`;

      // Upload selfie
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, capturedBlob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('employee-media')
        .getPublicUrl(fileName);

      // Create attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          user_id: user.id,
          attendance_date: today,
          punch_in_time: new Date().toISOString(),
          punch_in_lat: location.lat,
          punch_in_lng: location.lng,
          selfie_url: urlData.publicUrl,
          role: 'bms_executive',
          status: 'present'
        });

      if (insertError) throw insertError;

      toast.success('Check-in successful!');
      fetchTodayAttendance();
      setSelfieUrl(null);
      setCapturedBlob(null);
      setLocation(null);
      setCaptureTime(null);
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.message || 'Failed to check in');
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

  // Already checked in today
  if (todayAttendance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Attendance Recorded
          </CardTitle>
          <CardDescription>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">Present</Badge>
            <span className="text-sm text-muted-foreground">
              Checked in at {todayAttendance.punch_in_time ? format(new Date(todayAttendance.punch_in_time), 'h:mm a') : '-'}
            </span>
          </div>
          
          {todayAttendance.selfie_url && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Check-in Selfie</p>
              <img 
                src={todayAttendance.selfie_url} 
                alt="Check-in selfie" 
                className="w-32 h-32 rounded-lg object-cover"
              />
            </div>
          )}

          {todayAttendance.punch_in_lat && todayAttendance.punch_in_lng && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Location</p>
              <a
                href={`https://www.google.com/maps?q=${todayAttendance.punch_in_lat},${todayAttendance.punch_in_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline flex items-center gap-1"
              >
                <MapPin className="h-4 w-4" />
                View on Map
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Check-in form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Check-In
        </CardTitle>
        <CardDescription>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Take Selfie with Location</label>
          
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
                <Button onClick={capturePhoto} disabled={capturing} className="flex-1">
                  {capturing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={stopCamera} disabled={capturing}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : selfieUrl && location && captureTime ? (
            <div className="space-y-3">
              <img src={selfieUrl} alt="Captured selfie" className="w-32 h-32 rounded-lg object-cover" />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(captureTime, 'dd MMM yyyy, h:mm:ss a')}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setSelfieUrl(null);
                setCapturedBlob(null);
                setLocation(null);
                setCaptureTime(null);
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

        {/* Submit Button */}
        <Button
          onClick={handleCheckIn}
          disabled={!capturedBlob || !location || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking In...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Check In
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
