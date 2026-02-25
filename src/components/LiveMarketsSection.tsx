import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Users, MapPin, Clock, IndianRupee, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import EmployeeLocationMiniMap from '@/components/admin/EmployeeLocationMiniMap';
import { useLiveMarketsData, type LiveMarket } from '@/hooks/useLiveMarketsData';

interface LiveMarketsSectionProps {
  showNavigateToEmployee?: boolean;
  onEmployeeClick?: (employeeId: string) => void;
}

export default function LiveMarketsSection({ showNavigateToEmployee = false, onEmployeeClick }: LiveMarketsSectionProps) {
  const { liveMarkets, isLoading, refetch } = useLiveMarketsData();
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    taskType: string;
    data: any[];
    marketName: string;
  }>({ open: false, taskType: '', data: [], marketName: '' });

  useEffect(() => {
    const channel = supabase
      .channel('live-markets-section')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => refetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
  };

  const isISTMonday = () => {
    const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istNow.getDay() === 1;
  };

  const fetchTaskData = async (marketId: string, marketName: string, taskType: string) => {
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let data: any[] = [];

    try {
      switch (taskType) {
        case 'stall_confirmations': {
          const { data: d } = await supabase.from('stall_confirmations').select('*').eq('market_id', marketId).eq('market_date', todayDate).order('created_at', { ascending: false });
          data = d || [];
          break;
        }
        case 'offers': {
          const { data: d } = await supabase.from('offers').select('*').eq('market_id', marketId).eq('market_date', todayDate).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map(o => o.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = d.map(o => ({ ...o, employees: { full_name: empMap.get(o.user_id) } }));
          }
          break;
        }
        case 'commodities': {
          const { data: d } = await supabase.from('non_available_commodities').select('*').eq('market_id', marketId).eq('market_date', todayDate).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map(c => c.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = d.map(c => ({ ...c, employees: { full_name: empMap.get(c.user_id) } }));
          }
          break;
        }
        case 'feedback': {
          const { data: d } = await supabase.from('organiser_feedback').select('*').eq('market_id', marketId).eq('market_date', todayDate).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map(f => f.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = d.map(f => ({ ...f, employees: { full_name: empMap.get(f.user_id) } }));
          }
          break;
        }
        case 'inspections': {
          const { data: d } = await supabase.from('stall_inspections').select('*, sessions!inner(user_id)').eq('market_id', marketId).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map((i: any) => i.sessions?.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = d.map((i: any) => ({ ...i, employees: { full_name: empMap.get(i.sessions?.user_id) } }));
          }
          break;
        }
        case 'planning': {
          const { data: d } = await supabase.from('next_day_planning').select('*').eq('market_id', marketId).eq('market_date', todayDate).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map(p => p.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = d.map(p => ({ ...p, employees: { full_name: empMap.get(p.user_id) } }));
          }
          break;
        }
        case 'attendance': {
          const { data: d } = await supabase.from('sessions').select('*').eq('market_id', marketId).eq('session_date', todayDate).order('punch_in_time', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map(s => s.user_id).filter(Boolean))];
            const sessionIds = d.map(s => s.id);
            const [empRes, attRes] = await Promise.all([
              supabase.from('employees').select('id, full_name').in('id', userIds),
              supabase.from('attendance_records').select('session_id, selfie_url, punch_in_lat, punch_in_lng, punch_out_lat, punch_out_lng').in('session_id', sessionIds),
            ]);
            const empMap = new Map(empRes.data?.map(e => [e.id, e.full_name]) || []);
            const attMap = new Map(attRes.data?.map(a => [a.session_id, a]) || []);
            data = await Promise.all(d.map(async (s) => {
              const att = attMap.get(s.id);
              let signedUrl = null;
              if (att?.selfie_url) {
                const { data: signed } = await supabase.storage.from('employee-media').createSignedUrl(att.selfie_url, 3600);
                signedUrl = signed?.signedUrl || null;
              }
              return { ...s, selfie_url: signedUrl, punch_in_lat: att?.punch_in_lat ?? null, punch_in_lng: att?.punch_in_lng ?? null, punch_out_lat: att?.punch_out_lat ?? null, punch_out_lng: att?.punch_out_lng ?? null, employees: { full_name: empMap.get(s.user_id) } };
            }));
          }
          break;
        }
        case 'collections': {
          const { data: d } = await supabase.from('collections').select('*').eq('market_id', marketId).eq('collection_date', todayDate).order('created_at', { ascending: false });
          data = d || [];
          break;
        }
        case 'market_video':
        case 'cleaning_video':
        case 'customer_feedback':
        case 'outside_rates':
        case 'rate_board':
        case 'selfie_gps': {
          const mediaType = taskType;
          const { data: d } = await supabase.from('media').select('*, sessions!inner(user_id, market_id, session_date)').eq('sessions.market_id', marketId).eq('sessions.session_date', todayDate).eq('media_type', mediaType as any).order('created_at', { ascending: false });
          if (d && d.length > 0) {
            const userIds = [...new Set(d.map((m: any) => m.sessions?.user_id).filter(Boolean))];
            const { data: emp } = await supabase.from('employees').select('id, full_name').in('id', userIds);
            const empMap = new Map(emp?.map(e => [e.id, e.full_name]) || []);
            data = await Promise.all(d.map(async (m: any) => {
              const { data: signed } = await supabase.storage.from('employee-media').createSignedUrl(m.file_url, 3600);
              return { ...m, file_url: signed?.signedUrl || m.file_url, employees: { full_name: empMap.get(m.sessions?.user_id) } };
            }));
          }
          break;
        }
      }
      setTaskDialog({ open: true, taskType, data, marketName });
    } catch (error) {
      console.error(`Error fetching ${taskType} data:`, error);
    }
  };

  const getTaskTitle = (taskType: string) => {
    const titles: Record<string, string> = {
      stall_confirmations: 'Stall Confirmations', offers: "Today's Offers", commodities: 'Non-Available Commodities',
      feedback: 'Organiser Feedback', inspections: 'Stall Inspections', planning: 'Next Day Planning',
      market_video: 'Market Videos', cleaning_video: 'Cleaning Videos', attendance: 'Attendance Records',
      collections: 'Collections', selfie_gps: 'Selfie GPS Uploads', outside_rates: 'Outside Rates',
      rate_board: 'Rate Board', customer_feedback: 'Customer Feedback',
    };
    return titles[taskType] || taskType;
  };

  const renderTaskDialogContent = () => {
    const { taskType, data } = taskDialog;
    if (data.length === 0) return <div className="text-center py-8 text-muted-foreground">No data available</div>;

    switch (taskType) {
      case 'stall_confirmations':
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Stall No</TableHead><TableHead>Stall Name</TableHead><TableHead>Farmer Name</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(item => (
              <TableRow key={item.id}><TableCell>{item.stall_no}</TableCell><TableCell>{item.stall_name}</TableCell><TableCell>{item.farmer_name}</TableCell><TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        );
      case 'offers':
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Employee</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(item => (
              <TableRow key={item.id}><TableCell>{item.commodity_name}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.price ? `₹${item.price}` : 'N/A'}</TableCell><TableCell>{item.employees?.full_name || 'N/A'}</TableCell><TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        );
      case 'commodities':
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Commodity Name</TableHead><TableHead>Notes</TableHead><TableHead>Employee</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(item => (
              <TableRow key={item.id}><TableCell>{item.commodity_name}</TableCell><TableCell>{item.notes || '-'}</TableCell><TableCell>{item.employees?.full_name || 'N/A'}</TableCell><TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        );
      case 'feedback':
        return (
          <div className="space-y-4">{data.map(item => (
            <Card key={item.id}>
              <CardHeader><CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle><CardDescription>{format(new Date(item.created_at), 'HH:mm')}</CardDescription></CardHeader>
              <CardContent>
                {item.difficulties && <div className="mb-2"><strong>Difficulties:</strong> {item.difficulties}</div>}
                {item.feedback && <div><strong>Feedback:</strong> {item.feedback}</div>}
              </CardContent>
            </Card>
          ))}</div>
        );
      case 'inspections':
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Farmer Name</TableHead><TableHead>Employee</TableHead><TableHead>Items</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(item => {
              const items = [];
              if (item.has_tent) items.push('Tent'); if (item.has_table) items.push('Table');
              if (item.has_green_net) items.push('Green Net'); if (item.has_flex) items.push('Flex');
              if (item.has_rateboard) items.push('Rate Board'); if (item.has_light) items.push('Light');
              if (item.has_apron) items.push('Apron'); if (item.has_display) items.push('Display');
              if (item.has_digital_weighing_machine) items.push('Weighing Machine');
              if (item.has_mat) items.push('Mat'); if (item.has_cap) items.push('Cap');
              return (
                <TableRow key={item.id}><TableCell>{item.farmer_name}</TableCell><TableCell>{item.employees?.full_name || 'N/A'}</TableCell><TableCell>{items.join(', ') || 'None'}</TableCell><TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell></TableRow>
              );
            })}</TableBody>
          </Table>
        );
      case 'planning':
        return (
          <div className="space-y-4">{data.map(item => (
            <Card key={item.id}>
              <CardHeader><CardTitle className="text-sm">{item.next_day_market_name}</CardTitle><CardDescription>By {item.employees?.full_name || 'Unknown'} at {format(new Date(item.created_at), 'HH:mm')}</CardDescription></CardHeader>
              <CardContent><div className="whitespace-pre-wrap">{item.stall_list}</div></CardContent>
            </Card>
          ))}</div>
        );
      case 'attendance':
        return (
          <div className="space-y-4">{data.map(item => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between"><CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle><Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>{item.status}</Badge></div>
                <CardDescription className="text-xs">
                  <div>Punch In: {item.punch_in_time ? format(new Date(item.punch_in_time), 'HH:mm') : 'N/A'} | Punch Out: {item.punch_out_time ? format(new Date(item.punch_out_time), 'HH:mm') : 'N/A'}</div>
                  {(item.punch_in_lat && item.punch_in_lng) ? (
                    <a href={`https://www.google.com/maps?q=${item.punch_in_lat},${item.punch_in_lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      GPS: ({Number(item.punch_in_lat).toFixed(6)}, {Number(item.punch_in_lng).toFixed(6)})
                    </a>
                  ) : <div className="mt-1 text-xs text-muted-foreground">GPS not available</div>}
                </CardDescription>
              </CardHeader>
              {item.selfie_url && (
                <CardContent>
                  <img src={item.selfie_url} alt="Selfie" className="w-32 h-32 object-cover rounded-md cursor-pointer" onClick={() => window.open(item.selfie_url, '_blank')} />
                </CardContent>
              )}
            </Card>
          ))}</div>
        );
      case 'collections':
        return (
          <Table>
            <TableHeader><TableRow><TableHead>Stall</TableHead><TableHead>Farmer</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(item => (
              <TableRow key={item.id}><TableCell>{item.stall_name || '-'}</TableCell><TableCell>{item.farmer_name || '-'}</TableCell><TableCell>₹{item.amount}</TableCell><TableCell><Badge variant={item.mode === 'cash' ? 'default' : 'secondary'}>{item.mode}</Badge></TableCell><TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        );
      case 'market_video':
      case 'cleaning_video':
        return (
          <div className="space-y-4">{data.map(item => (
            <Card key={item.id}>
              <CardHeader><CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle><CardDescription>{format(new Date(item.created_at), 'HH:mm')}</CardDescription></CardHeader>
              <CardContent><video controls className="w-full rounded-md"><source src={item.file_url} type={item.content_type} /></video></CardContent>
            </Card>
          ))}</div>
        );
      case 'selfie_gps':
      case 'outside_rates':
      case 'rate_board':
      case 'customer_feedback':
        return (
          <div className="space-y-4">{data.map(item => (
            <Card key={item.id}>
              <CardHeader><CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle><CardDescription>{format(new Date(item.created_at), 'HH:mm')}</CardDescription></CardHeader>
              <CardContent>
                {item.content_type?.startsWith('video/') ? (
                  <video controls className="w-full rounded-md"><source src={item.file_url} type={item.content_type} /></video>
                ) : item.content_type?.startsWith('audio/') ? (
                  <audio controls className="w-full"><source src={item.file_url} type={item.content_type} /></audio>
                ) : (
                  <img src={item.file_url} alt={taskType} className="w-full rounded-md cursor-pointer" onClick={() => window.open(item.file_url, '_blank')} />
                )}
              </CardContent>
            </Card>
          ))}</div>
        );
      default:
        return <div>Unknown task type</div>;
    }
  };

  const renderTaskChecklist = (market: LiveMarket) => {
    const tasks = [
      { label: 'Punch In', completed: market.task_stats ? market.task_stats.attendance > 0 : false, value: market.task_stats?.attendance ? `${market.task_stats.attendance} checked in` : null, taskType: 'attendance' },
      { label: 'Stall Confirmations', completed: market.task_stats ? market.task_stats.stall_confirmations > 0 : false, value: market.task_stats?.stall_confirmations ? `${market.task_stats.stall_confirmations} confirmed` : null, taskType: 'stall_confirmations' },
      { label: 'Outside Rates', completed: market.task_stats ? market.task_stats.outside_rates > 0 : false, value: market.task_stats?.outside_rates ? `${market.task_stats.outside_rates} uploaded` : null, taskType: 'outside_rates' },
      { label: 'Rate Board Photo', completed: market.task_stats ? market.task_stats.rate_board > 0 : false, value: market.task_stats?.rate_board ? `${market.task_stats.rate_board} uploaded` : null, taskType: 'rate_board' },
      { label: 'Market Video', completed: market.task_stats ? market.task_stats.market_video > 0 : false, taskType: 'market_video' },
      { label: 'Cleaning Video', completed: market.task_stats ? market.task_stats.cleaning_video > 0 : false, taskType: 'cleaning_video' },
      { label: 'Customer Feedback', completed: market.task_stats ? market.task_stats.customer_feedback > 0 : false, taskType: 'customer_feedback' },
      { label: "Today's Offers", completed: market.task_stats ? market.task_stats.offers > 0 : false, value: market.task_stats?.offers ? `${market.task_stats.offers} items` : null, taskType: 'offers' },
      { label: 'Non-Available Commodities', completed: market.task_stats ? market.task_stats.commodities > 0 : false, value: market.task_stats?.commodities ? `${market.task_stats.commodities} items` : null, taskType: 'commodities' },
      { label: 'Organiser Feedback', completed: market.task_stats ? market.task_stats.feedback > 0 : false, taskType: 'feedback' },
      { label: 'Stall Inspections', completed: market.task_stats ? market.task_stats.inspections > 0 : false, value: market.task_stats?.inspections ? `${market.task_stats.inspections} stalls` : null, taskType: 'inspections' },
      { label: 'Next Day Planning', completed: market.task_stats ? market.task_stats.planning > 0 : false, taskType: 'planning' },
      { label: 'Collections', completed: market.task_stats ? market.task_stats.collections > 0 : false, value: market.task_stats?.collections ? `${market.task_stats.collections} entries` : null, taskType: 'collections' },
    ];

    return (
      <div className="grid grid-cols-2 gap-1 md:gap-1.5">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-center gap-1 md:gap-2 cursor-pointer hover:bg-accent/50 px-1 py-0.5 md:px-1.5 md:py-1 rounded transition-colors"
            onClick={() => fetchTaskData(market.market_id, market.market_name, task.taskType)}>
            <Checkbox checked={task.completed} disabled className="pointer-events-none h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-xs font-medium leading-tight truncate">{task.label}</div>
              {task.value && <div className="text-[8px] md:text-[10px] text-muted-foreground leading-tight truncate">{task.value}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Live Markets Today</h2>
        <Badge variant="outline" className="text-xs px-2 py-0.5">{liveMarkets.length} Active</Badge>
      </div>

      {liveMarkets.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">
              {isISTMonday() ? 'Markets are closed on Mondays' : 'No active markets today'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5">
          {liveMarkets.map((market) => (
            <Card key={market.market_id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="grid md:grid-cols-[40%_60%] gap-2 md:gap-3 p-3">
                {/* Left Column: Market Info + Employee Locations */}
                <div className="space-y-3">
                  <div className="grid grid-cols-[55%_45%] gap-2 md:grid-cols-1 md:gap-0">
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold leading-tight">{market.market_name}</h3>
                          <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0 h-5 hidden md:flex">{market.active_sessions} active</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />{market.city || 'N/A'}
                        </p>
                        <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0 h-5 md:hidden">{market.active_sessions} active</Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" /><span>Employees ({market.employees.length})</span>
                        </div>
                        {market.employees.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">No active employees</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {market.employees.map((employee) => (
                              <HoverCard key={employee.id}>
                                <HoverCardTrigger asChild>
                                  <div className="flex items-center gap-1.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                                    onClick={() => onEmployeeClick?.(employee.id)}>
                                    <span className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full shrink-0 ${
                                      employee.status === 'active' ? 'bg-green-500' : employee.status === 'half_day' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} />
                                    <span className="text-[10px] md:text-xs font-medium truncate max-w-[60px] md:max-w-[120px] underline">{employee.name}</span>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold">{employee.name}</h4>
                                      <Badge variant={employee.status === 'completed' ? 'default' : employee.status === 'half_day' ? 'secondary' : 'outline'}>
                                        {employee.status === 'completed' ? '🟢 Completed' : employee.status === 'half_day' ? '🟡 Incomplete' : '🔴 Active'}
                                      </Badge>
                                    </div>
                                    <div className="space-y-1.5 text-sm">
                                      {employee.punch_in_time && (
                                        <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Punch In:</span><span className="font-medium">{format(new Date(employee.punch_in_time), 'hh:mm a')}</span></div>
                                      )}
                                      {employee.punch_out_time && (
                                        <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Punch Out:</span><span className="font-medium">{format(new Date(employee.punch_out_time), 'hh:mm a')}</span></div>
                                      )}
                                      {employee.duration && (
                                        <div className="flex items-center gap-2"><span className="text-muted-foreground">Duration:</span><span className="font-medium">{Math.floor(employee.duration / 60)}h {employee.duration % 60}m</span></div>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Task Progress:</span>
                                        <span className="font-medium">{employee.completed_tasks}/{employee.total_tasks}</span>
                                        {employee.total_tasks > 0 && <span className="text-xs text-muted-foreground">({Math.round((employee.completed_tasks / employee.total_tasks) * 100)}%)</span>}
                                      </div>
                                      {employee.punch_in_lat && employee.punch_in_lng && (
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${employee.punch_in_lat},${employee.punch_in_lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                                          <Navigation className="h-3 w-3" /><span>Navigate to Location</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 border-t">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" /><span>Last upload: {formatTime(market.last_upload_time)}</span>
                        </div>
                      </div>

                      {/* Collection Amounts */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <IndianRupee className="h-3 w-3" /><span>Collections</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="rounded-md bg-muted px-2 py-1">
                            <div className="text-[9px] text-muted-foreground leading-tight">Expected</div>
                            <div className="text-[11px] font-semibold leading-tight">₹{(market.collection_amounts?.expected ?? 0).toLocaleString('en-IN')}</div>
                          </div>
                          <div className="rounded-md bg-green-500/10 px-2 py-1">
                            <div className="text-[9px] text-green-600 leading-tight">Received</div>
                            <div className="text-[11px] font-semibold text-green-600 leading-tight">₹{(market.collection_amounts?.received ?? 0).toLocaleString('en-IN')}</div>
                          </div>
                          <div className="rounded-md bg-orange-500/10 px-2 py-1">
                            <div className="text-[9px] text-orange-600 leading-tight">Pending</div>
                            <div className="text-[11px] font-semibold text-orange-600 leading-tight">₹{(market.collection_amounts?.pending ?? 0).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Map */}
                    <div className="md:hidden">
                      <h4 className="text-[10px] font-semibold mb-1 flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />Locations</h4>
                      <EmployeeLocationMiniMap
                        employees={market.employees.filter(e => e.punch_in_lat && e.punch_in_lng).map(e => ({ id: e.id, name: e.name, initials: e.initials, lat: e.punch_in_lat!, lng: e.punch_in_lng! }))}
                        className="h-[120px]"
                      />
                    </div>
                  </div>

                  {/* Desktop Map */}
                  <div className="pt-2 border-t hidden md:block">
                    <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1"><MapPin className="h-3 w-3" />Employee Locations</h4>
                    <EmployeeLocationMiniMap
                      employees={market.employees.filter(e => e.punch_in_lat && e.punch_in_lng).map(e => ({ id: e.id, name: e.name, initials: e.initials, lat: e.punch_in_lat!, lng: e.punch_in_lng! }))}
                      className="h-[140px]"
                    />
                  </div>
                </div>

                {/* Right Column: Task Status */}
                <div className="md:border-l md:pl-3 space-y-1.5 border-t pt-2 md:border-t-0 md:pt-0">
                  <h4 className="text-xs font-semibold">Task Status</h4>
                  {renderTaskChecklist(market)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={taskDialog.open} onOpenChange={(open) => setTaskDialog({ ...taskDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTaskTitle(taskDialog.taskType)} - {taskDialog.marketName}</DialogTitle>
          </DialogHeader>
          {renderTaskDialogContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
