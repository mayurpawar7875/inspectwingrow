import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LiveMarketsWidget from '@/components/admin/LiveMarketsWidget';
import LeaveRequestsWidget from '@/components/admin/LeaveRequestsWidget';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import ApprovedMarketsDocuments from '@/components/bdo/ApprovedMarketsDocuments';
import LocationVisitsWidget from '@/components/admin/LocationVisitsWidget';
import { ReimbursementRequestsWidget } from '@/components/admin/ReimbursementRequestsWidget';
import { toast } from 'sonner';
import { validateImage, generateUploadPath } from '@/lib/fileValidation';
import {
  LogOut,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Download,
  Plus,
  Camera,
  User,
  Phone,
  Mail,
  CalendarCheck,
  MapPin,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';

interface DistrictStats {
  total_markets: number;
  active_markets: number;
  total_sessions: number;
  active_sessions: number;
  total_employees: number;
  active_employees: number;
  media_uploads: number;
  collections_total: number;
  collections_count: number;
  completion_rate: number;
}

interface MarketSummary {
  market_id: string;
  market_name: string;
  city: string;
  active_sessions: number;
  active_employees: number;
  media_uploads: number;
  collections_total: number;
}

export default function BDODashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DistrictStats>({
    total_markets: 0,
    active_markets: 0,
    total_sessions: 0,
    active_sessions: 0,
    total_employees: 0,
    active_employees: 0,
    media_uploads: 0,
    collections_total: 0,
    collections_count: 0,
    completion_rate: 0,
  });
  const [marketSummaries, setMarketSummaries] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMarketDialog, setShowAddMarketDialog] = useState(false);
  const [uploadingMarket, setUploadingMarket] = useState(false);
  const [marketsToSubmit, setMarketsToSubmit] = useState<Array<{
    name: string;
    location: string;
    address: string;
    city: string;
    contactPersonName: string;
    contactPhone: string;
    contactEmail: string;
    openingDate: string;
    photoFile: File | null;
  }>>([]);
  const [marketForm, setMarketForm] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    contactPersonName: '',
    contactPhone: '',
    contactEmail: '',
    openingDate: '',
    photoFile: null as File | null,
  });
  const [showAddStallDialog, setShowAddStallDialog] = useState(false);
  const [uploadingStall, setUploadingStall] = useState(false);
  const [stallsToSubmit, setStallsToSubmit] = useState<Array<{
    farmerName: string;
    stallName: string;
    contactNumber: string;
    address: string;
    dateOfStartingMarkets: string;
  }>>([]);
  const [stallForm, setStallForm] = useState({
    farmerName: '',
    stallName: '',
    contactNumber: '',
    address: '',
    dateOfStartingMarkets: '',
  });
  
  // Session management states
  const [bdoSession, setBdoSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionLocation, setSessionLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);
  
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState(getISTDateString(new Date()));
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    // Wait for auth to load and role to be determined
    if (authLoading) {
      return;
    }

    // Redirect if not BDO
    if (currentRole !== 'bdo') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'market_manager') {
        navigate('/manager-dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    // Only fetch if we're staying on this dashboard
    if (currentRole === 'bdo') {
      // BDO can access dashboard after punching in, but by default should go to punch page
      // This page can be accessed via navigation but punch page is the entry point
      fetchDistrictStats();
      fetchMarketSummaries();
      fetchBDOSession();
      getSessionLocation();
    }
  }, [currentRole, navigate, selectedDate, authLoading]);

  // Real-time subscription for live markets
  useEffect(() => {
    const channel = supabase
      .channel('live-markets-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchMarketSummaries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchMarketSummaries)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchMarketSummaries)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDistrictStats = async () => {
    try {
      setLoading(true);
      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch all markets
      const { data: allMarkets, error: marketsError } = await supabase
        .from('markets')
        .select('id, is_active')
        .eq('is_active', true);

      if (marketsError) throw marketsError;

      // Query directly from markets and sessions
      const { data: sessionsForDay, error: sessionsErr } = await supabase
        .from('sessions')
        .select('id, market_id, user_id, status')
        .eq('session_date', dateStr);

      if (sessionsErr) throw sessionsErr;

      const { data: mediaFiles, error: mediaErr } = await supabase
        .from('media')
        .select('id, market_id, session_id')
        .in('session_id', sessionsForDay?.map(s => s.id) || []);

      if (mediaErr) {
        console.error('Error fetching media:', mediaErr);
      }

      // Aggregate by market
      const marketAgg = new Map<string, any>();
      sessionsForDay?.forEach(s => {
        const existing = marketAgg.get(s.market_id) || {
          market_id: s.market_id,
          active_sessions: 0,
          active_employees: new Set<string>(),
          media_uploads_count: 0,
        };
        if (s.status === 'active') existing.active_sessions++;
        if (['active', 'finalized'].includes(s.status)) {
          existing.active_employees.add(s.user_id);
        }
        marketAgg.set(s.market_id, existing);
      });

      mediaFiles?.forEach(m => {
        const existing = marketAgg.get(m.market_id);
        if (existing) {
          existing.media_uploads_count++;
        }
      });

      const liveMarkets = Array.from(marketAgg.values()).map(m => ({
        market_id: m.market_id,
        active_sessions: m.active_sessions || 0,
        active_employees: m.active_employees?.size || 0,
        media_uploads_count: m.media_uploads_count || 0,
      }));

      // Fetch total employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      // Fetch sessions for date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('session_date', dateStr);

      if (sessionsError) throw sessionsError;

      // Fetch collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('amount')
        .eq('collection_date', dateStr);

      if (collectionsError) throw collectionsError;

      // Fetch BDO's own media uploads via sessions
      const { data: bdoSessions, error: bdoSessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user?.id)
        .eq('session_date', dateStr);

      let bdoMedia: any[] = [];
      if (!bdoSessionsError && bdoSessions && bdoSessions.length > 0) {
        const { data, error: bdoMediaError } = await supabase
          .from('media')
          .select('id')
          .in('session_id', bdoSessions.map(s => s.id));
        
        if (bdoMediaError) {
          console.error('Error fetching BDO media:', bdoMediaError);
        } else {
          bdoMedia = data || [];
        }
      }

      // Calculate totals
      const totalMarkets = allMarkets?.length || 0;
      const activeMarkets = liveMarkets?.length || 0;
      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter((s: any) => s.status === 'active').length || 0;
      const completedSessions = sessions?.filter((s: any) => ['completed', 'finalized'].includes(s.status)).length || 0;
      const totalEmployees = (employees as any)?.length || 0;
      
      // Combine market media uploads and BDO's own uploads
      const marketMediaUploads = liveMarkets.reduce((sum: number, m: any) => sum + (m.media_uploads_count || 0), 0) || 0;
      const bdoMediaUploads = bdoMedia?.length || 0;
      const mediaUploads = marketMediaUploads + bdoMediaUploads;
      const collectionsTotal = collections?.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0) || 0;
      const collectionsCount = collections?.length || 0;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      const activeEmployees = liveMarkets.reduce((sum: number, m: any) => sum + (m.active_employees || 0), 0) || 0;

      setStats({
        total_markets: totalMarkets,
        active_markets: activeMarkets,
        total_sessions: totalSessions,
        active_sessions: activeSessions,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        media_uploads: mediaUploads,
        collections_total: collectionsTotal,
        collections_count: collectionsCount,
        completion_rate: completionRate,
      });
    } catch (error: any) {
      console.error('Error fetching district stats:', error);
      toast.error(error?.message || 'Failed to load district statistics');
      // Set default stats on error so dashboard still renders
      setStats({
        total_markets: 0,
        active_markets: 0,
        total_sessions: 0,
        active_sessions: 0,
        total_employees: 0,
        active_employees: 0,
        media_uploads: 0,
        collections_total: 0,
        collections_count: 0,
        completion_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketSummaries = async () => {
    try {
      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch active markets
      const { data: markets, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, city')
        .eq('is_active', true);

      if (marketsError) throw marketsError;

      // Fetch sessions for today
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, market_id, user_id, status')
        .eq('session_date', dateStr);

      if (sessionsError) throw sessionsError;

      // Fetch collections for each market
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('collection_date', dateStr);

      if (collectionsError) throw collectionsError;

      // Get media count per market
      const sessionIds = sessions?.map(s => s.id) || [];
      const { data: mediaFiles } = await supabase
        .from('media')
        .select('market_id, session_id')
        .in('session_id', sessionIds);

      // Build maps for aggregation
      const collectionsMap = new Map<string, number>();
      collections?.forEach((item: any) => {
        const marketId = item.market_id;
        const existing = collectionsMap.get(marketId) || 0;
        collectionsMap.set(marketId, existing + Number(item.amount || 0));
      });

      const marketSessionsMap = new Map<string, Set<string>>();
      const marketEmployeesMap = new Map<string, Set<string>>();
      const marketMediaMap = new Map<string, number>();

      sessions?.forEach((s: any) => {
        if (!marketSessionsMap.has(s.market_id)) {
          marketSessionsMap.set(s.market_id, new Set());
          marketEmployeesMap.set(s.market_id, new Set());
        }
        if (s.status === 'active') {
          marketSessionsMap.get(s.market_id)?.add(s.id);
        }
        if (['active', 'finalized'].includes(s.status)) {
          marketEmployeesMap.get(s.market_id)?.add(s.user_id);
        }
      });

      mediaFiles?.forEach((m: any) => {
        const marketId = m.market_id;
        if (marketId) {
          marketMediaMap.set(marketId, (marketMediaMap.get(marketId) || 0) + 1);
        }
      });

      const summaries: MarketSummary[] = (markets || [])
        .filter((market: any) => 
          marketSessionsMap.has(market.id) || 
          marketMediaMap.has(market.id) || 
          collectionsMap.has(market.id)
        )
        .map((market: any) => ({
          market_id: market.id,
          market_name: market.name,
          city: market.city || 'N/A',
          active_sessions: marketSessionsMap.get(market.id)?.size || 0,
          active_employees: marketEmployeesMap.get(market.id)?.size || 0,
          media_uploads: marketMediaMap.get(market.id) || 0,
          collections_total: collectionsMap.get(market.id) || 0,
        }));

      setMarketSummaries(summaries || []);
    } catch (error: any) {
      console.error('Error fetching market summaries:', error);
      setMarketSummaries([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAddToQueue = () => {
    // Validate required fields
    if (!marketForm.name.trim()) {
      toast.error('Market name is required');
      return;
    }
    if (!marketForm.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!marketForm.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!marketForm.contactPersonName.trim()) {
      toast.error('Contact person name is required');
      return;
    }
    if (!marketForm.contactPhone.trim()) {
      toast.error('Contact phone is required');
      return;
    }
    if (!marketForm.openingDate) {
      toast.error('Opening date is required');
      return;
    }

    // Add to queue
    setMarketsToSubmit([...marketsToSubmit, { ...marketForm }]);
    
    // Reset form
    setMarketForm({
      name: '',
      location: '',
      address: '',
      city: '',
      contactPersonName: '',
      contactPhone: '',
      contactEmail: '',
      openingDate: '',
      photoFile: null,
    });
    
    toast.success('Market added to queue. Add more or submit all.');
  };

  const handleRemoveFromQueue = (index: number) => {
    setMarketsToSubmit(marketsToSubmit.filter((_, i) => i !== index));
    toast.success('Market removed from queue');
  };

  const handleSubmitAllMarkets = async () => {
    if (!user) return;
    
    if (marketsToSubmit.length === 0) {
      toast.error('Please add at least one market location');
      return;
    }

    setUploadingMarket(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const market of marketsToSubmit) {
        try {
          let photoUrl: string | null = null;
          
          // Upload photo if provided
          if (market.photoFile) {
            // Validate image file
            try {
              validateImage(market.photoFile);
            } catch (validationError) {
              errorCount++;
              continue;
            }

            const fileName = generateUploadPath(user.id, market.photoFile.name, 'market-locations');
            const { error: uploadError } = await supabase.storage
              .from('employee-media')
              .upload(fileName, market.photoFile);
            
            if (uploadError) {
              console.error('Photo upload error:', uploadError);
              errorCount++;
              continue;
            }
            
            photoUrl = fileName; // Store path, not full URL
          }

          // Validate required fields
          if (!market.location?.trim()) {
            toast.error("Location is required for market: " + market.name);
            errorCount++;
            continue;
          }

          // Submit to BDO market submissions table for admin review
          const { error: submissionError } = await supabase
            .from('bdo_market_submissions')
            .insert({
              market_name: market.name.trim(),
              google_map_location: market.location.trim(),
              location_type: 'urban',
              market_opening_date: market.openingDate,
              submission_metadata: {
                address: market.address.trim(),
                city: market.city?.trim() || null,
                contact_person_name: market.contactPersonName.trim(),
                contact_phone: market.contactPhone.trim(),
                contact_email: market.contactEmail?.trim() || null,
              },
              video_url: photoUrl || null,
              submitted_by: user.id,
              status: 'pending_review',
            });

          if (submissionError) {
            console.error('Market submission error:', submissionError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error submitting market:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully submitted ${successCount} market location(s)! They will be reviewed by admin before activation.`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to submit ${errorCount} market location(s).`);
      }

      // Reset everything
      setMarketsToSubmit([]);
      setMarketForm({
        name: '',
        location: '',
        address: '',
        city: '',
        contactPersonName: '',
        contactPhone: '',
        contactEmail: '',
        openingDate: '',
        photoFile: null,
      });
      
      setShowAddMarketDialog(false);
      
    } catch (error: any) {
      console.error('Error submitting markets:', error);
      toast.error(error.message || 'Failed to submit market locations');
    } finally {
      setUploadingMarket(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setMarketForm({ ...marketForm, photoFile: file });
    }
  };

  const handleAddStallToQueue = () => {
    // Validate required fields
    if (!stallForm.farmerName.trim()) {
      toast.error('Farmer name is required');
      return;
    }
    if (!stallForm.stallName.trim()) {
      toast.error('Stall name is required');
      return;
    }
    if (!stallForm.contactNumber.trim()) {
      toast.error('Contact number is required');
      return;
    }
    if (!stallForm.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!stallForm.dateOfStartingMarkets) {
      toast.error('Date of starting markets is required');
      return;
    }

    // Add to queue
    setStallsToSubmit([...stallsToSubmit, { ...stallForm }]);
    
    // Reset form
    setStallForm({
      farmerName: '',
      stallName: '',
      contactNumber: '',
      address: '',
      dateOfStartingMarkets: '',
    });
    
    toast.success('Stall added to queue. Add more or submit all.');
  };

  const handleRemoveStallFromQueue = (index: number) => {
    setStallsToSubmit(stallsToSubmit.filter((_, i) => i !== index));
    toast.success('Stall removed from queue');
  };

  const handleSubmitAllStalls = async () => {
    if (!user) return;
    
    if (stallsToSubmit.length === 0) {
      toast.error('Please add at least one stall');
      return;
    }

    setUploadingStall(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const stall of stallsToSubmit) {
        try {
          // Submit to BDO stall submissions table for admin review
          const { error: submissionError } = await supabase
            .from('bdo_stall_submissions')
            .insert({
              farmer_name: stall.farmerName.trim(),
              stall_name: stall.stallName.trim(),
              contact_number: stall.contactNumber.trim(),
              address: stall.address.trim(),
              date_of_starting_markets: stall.dateOfStartingMarkets,
              submitted_by: user.id,
              status: 'pending',
            });

          if (submissionError) {
            console.error('Stall submission error:', submissionError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error submitting stall:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully onboarded ${successCount} stall(s)! Submissions will be reviewed by admin.`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to onboard ${errorCount} stall(s).`);
      }

      // Reset everything
      setStallsToSubmit([]);
      setStallForm({
        farmerName: '',
        stallName: '',
        contactNumber: '',
        address: '',
        dateOfStartingMarkets: '',
      });
      
      setShowAddStallDialog(false);
      
    } catch (error: any) {
      console.error('Error submitting stalls:', error);
      toast.error(error.message || 'Failed to onboard stalls');
    } finally {
      setUploadingStall(false);
    }
  };

  // BDO Session Functions
  const fetchBDOSession = async () => {
    if (!user) return;

    try {
      const today = getISTDateString(new Date());
      
      // BDOs use the bdo_sessions table for time-based attendance tracking
      const { data: sessionData, error: sessionError } = await supabase
        .from('bdo_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Session fetch error:', sessionError);
        return;
      }

      setBdoSession(sessionData || null);
    } catch (error: any) {
      console.error('Error fetching session:', error);
    }
  };

  const getSessionLocation = async () => {
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

      setSessionLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (error: any) {
      console.error('Location error:', error);
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
          toast.success('Photo captured successfully');
        } else {
          toast.error('Failed to capture photo');
        }
      }, 'image/jpeg', 0.95);
    } else {
      toast.error('Failed to initialize canvas');
    }
  };

  const clearPhoto = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">BDO Dashboard</h1>
            <p className="text-sm text-muted-foreground">District-level Reporting</p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => navigate('/bdo-session')}>
              <Clock className="h-4 w-4 mr-2" />
              My Session
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/bdo/live-markets')}>
              <MapPin className="h-4 w-4 mr-2" />
              Live Markets
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Session
            </CardTitle>
            <CardDescription>
              {bdoSession?.punch_in_time && !bdoSession?.punch_out_time && 'Session in progress'}
              {bdoSession?.punch_out_time && 'Session completed'}
              {!bdoSession?.punch_in_time && 'Start your session'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!bdoSession?.punch_in_time ? (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No session started today</p>
                <Button onClick={() => navigate('/bdo-session')}>Start Session</Button>
              </div>
            ) : bdoSession?.punch_out_time ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="font-medium">Session Completed</p>
                <p className="text-sm text-muted-foreground">Working Hours: {bdoSession.working_hours?.toFixed(2)} hrs</p>
                <Badge className="mt-2">{bdoSession.attendance_status === 'full_day' ? 'Full Day' : bdoSession.attendance_status === 'half_day' ? 'Half Day' : 'Absent'}</Badge>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <Badge className="mb-4">Session Active</Badge>
                <Button variant="destructive" onClick={() => navigate('/bdo-session')}>Punch Out</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:bg-accent" onClick={() => setShowAddMarketDialog(true)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Market</CardTitle></CardHeader>
            <CardContent><Plus className="h-8 w-8 text-primary" /></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent" onClick={() => setShowAddStallDialog(true)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Add Stall</CardTitle></CardHeader>
            <CardContent><Plus className="h-8 w-8 text-primary" /></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate('/my-attendance')}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">My Attendance</CardTitle></CardHeader>
            <CardContent><CalendarCheck className="h-8 w-8 text-primary" /></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent" onClick={() => navigate('/my-sessions')}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">My Sessions</CardTitle></CardHeader>
            <CardContent><FileText className="h-8 w-8 text-primary" /></CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <LeaveRequestsWidget />
          <LocationVisitsWidget />
        </div>
        <LiveMarketsWidget />
      </main>
    </div>
  );
}
