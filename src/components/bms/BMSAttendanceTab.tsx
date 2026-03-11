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
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
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

  // Set video srcObject when stream and video element are ready
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

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

      // Get signed URL for selfie if exists
      if (data?.selfie_url) {
        const filePath = data.selfie_url.includes('employee-media/') 
          ? data.selfie_url.split('employee-media/')[1]
          : data.selfie_url;
        
        const { data: signedData } = await supabase.storage
          .from('employee-media')
          .createSignedUrl(filePath, 3600);
        
        if (signedData?.signedUrl) {
          setSignedSelfieUrl(signedData.signedUrl);
        }
      }
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
      <Card className="shadow-none border">
        <CardHeader className="pb-1.5 pt-3 px-3 md:px-6">
          <CardTitle className="flex items-center gap-1.5 text-sm md:text-lg">
            <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5 text-green-500" />
            Attendance Recorded
          </CardTitle>
          <CardDescription className="text-[10px] md:text-sm">
            {format(new Date(), 'EEE, MMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6 space-y-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="default" className="bg-green-500 text-[10px] h-5">Present</Badge>
            <span className="text-[11px] text-muted-foreground">
              {todayAttendance.punch_in_time ? format(new Date(todayAttendance.punch_in_time), 'h:mm a') : '-'}
            </span>
          </div>
          
          {signedSelfieUrl && (
            <img src={signedSelfieUrl} alt="Check-in selfie" className="w-20 h-20 rounded-md object-cover" />
          )}

          {todayAttendance.punch_in_lat && todayAttendance.punch_in_lng && (
            <a
              href={`https://www.google.com/maps?q=${todayAttendance.punch_in_lat},${todayAttendance.punch_in_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-[11px] hover:underline flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" />View on Map
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border">
      <CardHeader className="pb-1.5 pt-3 px-3 md:px-6">
        <CardTitle className="flex items-center gap-1.5 text-sm md:text-lg">
          <Clock className="h-3.5 w-3.5 md:h-5 md:w-5" />
          Daily Check-In
        </CardTitle>
        <CardDescription className="text-[10px] md:text-sm">
          {format(new Date(), 'EEE, MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3 md:px-6 md:pb-6 space-y-2.5 pt-1">
        {/* Camera Section */}
        <div className="space-y-1.5">
          <label className="text-[11px] md:text-sm font-medium">Take Selfie with Location</label>
          
          {showCamera ? (
            <div className="space-y-2">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-[200px] rounded-md bg-black" />
              <div className="flex gap-1.5">
                <Button onClick={capturePhoto} disabled={capturing} size="sm" className="flex-1 h-7 text-xs">
                  {capturing ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Capturing...</>
                  ) : (
                    <><Camera className="h-3 w-3 mr-1" />Capture</>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={stopCamera} disabled={capturing}>Cancel</Button>
              </div>
            </div>
          ) : selfieUrl && location && captureTime ? (
            <div className="space-y-1.5">
              <img src={selfieUrl} alt="Captured selfie" className="w-20 h-20 rounded-md object-cover" />
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" />
                  <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{format(captureTime, 'dd MMM, h:mm a')}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => {
                setSelfieUrl(null);
                setCapturedBlob(null);
                setLocation(null);
                setCaptureTime(null);
              }}>Retake</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={startCamera} className="w-full h-8 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1.5" />Take Selfie
            </Button>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleCheckIn}
          disabled={!capturedBlob || !location || submitting}
          className="w-full h-8 text-xs"
        >
          {submitting ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Checking In...</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Check In</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
