import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, Camera, LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface BDOSessionData {
  id: string;
  user_id: string;
  session_date: string;
  punch_in_time: string | null;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
  punch_in_selfie_url: string | null;
  punch_out_time: string | null;
  punch_out_lat: number | null;
  punch_out_lng: number | null;
  working_hours: number;
  attendance_status: string;
  status: string;
}

export default function BDOSession() {
  const navigate = useNavigate();
  const { user, currentRole } = useAuth();
  const [session, setSession] = useState<BDOSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    if (user && (currentRole === 'bdo' || currentRole === 'market_manager')) {
      fetchSession();
      getLocation();
    }
  }, [user, currentRole]);

  const fetchSession = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = getISTDateString(new Date());
      const { data, error } = await supabase
        .from('bdo_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Session fetch error:', error);
      }
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
      toast.error('Unable to get location. Please enable GPS.');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) {
      toast.error('Camera not ready');
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelfieFile(file);
          setSelfiePreview(URL.createObjectURL(blob));
          stopCamera();
          toast.success('Photo captured!');
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const clearPhoto = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  const handlePunchIn = async () => {
    if (!user || !location) {
      toast.error('Please wait for location');
      return;
    }
    if (!selfieFile) {
      toast.error('Please capture a selfie');
      return;
    }

    setActionLoading(true);
    try {
      const today = getISTDateString(new Date());
      
      // Upload selfie
      let selfieUrl = '';
      const filePath = `bdo-sessions/${user.id}/${today}/punch-in-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(filePath, selfieFile);
      
      if (uploadError) {
        console.error('Selfie upload error:', uploadError);
        // Continue without selfie URL if upload fails
      } else {
        const { data: urlData } = supabase.storage
          .from('employee-media')
          .getPublicUrl(filePath);
        selfieUrl = urlData?.publicUrl || '';
      }

      // Create session
      const { error } = await supabase
        .from('bdo_sessions')
        .insert({
          user_id: user.id,
          session_date: today,
          punch_in_time: new Date().toISOString(),
          punch_in_lat: location.lat,
          punch_in_lng: location.lng,
          punch_in_selfie_url: selfieUrl,
          status: 'active',
          attendance_status: 'pending',
        });

      if (error) throw error;

      toast.success('Punched in successfully!');
      clearPhoto();
      fetchSession();
    } catch (error: any) {
      console.error('Punch in error:', error);
      toast.error(error.message || 'Failed to punch in');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!user || !location || !session) {
      toast.error('Session not found or location unavailable');
      return;
    }

    setActionLoading(true);
    try {
      const punchOutTime = new Date();
      const punchInTime = new Date(session.punch_in_time!);
      
      // Calculate working hours
      const diffMs = punchOutTime.getTime() - punchInTime.getTime();
      const workingHours = diffMs / (1000 * 60 * 60); // Convert to hours

      // Determine attendance status based on working hours
      let attendanceStatus = 'absent';
      if (workingHours >= 8) {
        attendanceStatus = 'full_day';
      } else if (workingHours >= 4) {
        attendanceStatus = 'half_day';
      }

      const { error } = await supabase
        .from('bdo_sessions')
        .update({
          punch_out_time: punchOutTime.toISOString(),
          punch_out_lat: location.lat,
          punch_out_lng: location.lng,
          working_hours: Math.round(workingHours * 100) / 100, // Round to 2 decimal places
          attendance_status: attendanceStatus,
          status: 'completed',
        })
        .eq('id', session.id);

      if (error) throw error;

      toast.success(`Punched out! Working hours: ${workingHours.toFixed(2)} hrs - ${attendanceStatus === 'full_day' ? 'Full Day' : attendanceStatus === 'half_day' ? 'Half Day' : 'Absent'}`);
      fetchSession();
    } catch (error: any) {
      console.error('Punch out error:', error);
      toast.error(error.message || 'Failed to punch out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case 'full_day':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Full Day</span>;
      case 'half_day':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Half Day</span>;
      case 'absent':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Absent</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/bdo-dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Session
            </CardTitle>
            <CardDescription>
              {getISTDateString(new Date())} • {currentRole === 'bdo' ? 'BDO' : 'Market Manager'} Session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session Status */}
            {session ? (
              <div className="space-y-4">
                {/* Session Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Punch In</p>
                    <p className="font-medium">{formatTime(session.punch_in_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Punch Out</p>
                    <p className="font-medium">{formatTime(session.punch_out_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Working Hours</p>
                    <p className="font-medium">{session.working_hours?.toFixed(2) || '0.00'} hrs</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    {getAttendanceStatusBadge(session.attendance_status)}
                  </div>
                </div>

                {/* Current Session Status */}
                {session.status === 'active' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 dark:text-green-200">Session Active</span>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        GPS: {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Fetching...'}
                      </p>
                    </div>

                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium">Attendance Rules:</p>
                      <ul className="text-muted-foreground mt-1 space-y-1">
                        <li>• ≥ 8 hours = <span className="text-green-600">Full Day</span></li>
                        <li>• 4-8 hours = <span className="text-yellow-600">Half Day</span></li>
                        <li>• &lt; 4 hours = <span className="text-red-600">Absent</span></li>
                      </ul>
                    </div>

                    <Button
                      onClick={handlePunchOut}
                      disabled={actionLoading || !location}
                      className="w-full"
                      variant="destructive"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-2" />
                          Punch Out
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800 dark:text-blue-200">Session Completed for Today</span>
                  </div>
                )}
              </div>
            ) : (
              /* Punch In Form */
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-800 dark:text-amber-200">No session started today</span>
                </div>

                {/* Location Status */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {location ? (
                      <span className="text-green-600">Location captured</span>
                    ) : (
                      <span className="text-amber-600">Fetching location...</span>
                    )}
                  </span>
                </div>

                {/* Selfie Section */}
                {!selfiePreview ? (
                  <>
                    {showCamera ? (
                      <div className="space-y-3">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full aspect-video rounded-lg bg-black object-cover"
                        />
                        <div className="flex gap-2">
                          <Button onClick={capturePhoto} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                          </Button>
                          <Button onClick={stopCamera} variant="outline">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={startCamera} variant="outline" className="w-full">
                        <Camera className="h-4 w-4 mr-2" />
                        Take Selfie
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <img
                      src={selfiePreview}
                      alt="Selfie preview"
                      className="w-full aspect-video rounded-lg object-cover"
                    />
                    <Button onClick={clearPhoto} variant="outline" size="sm" className="w-full">
                      Retake Photo
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handlePunchIn}
                  disabled={actionLoading || !location || !selfieFile}
                  className="w-full"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Punch In
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
