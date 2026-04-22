import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, Loader2, Pencil, Save, X, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  username: string | null;
  profile_photo: string | null;
  address: string | null;
  emergency_contact: string | null;
  alternate_phone: string | null;
  joining_date: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  market_manager: 'Market Manager',
  bdo: 'Business Development Manager',
  bms_executive: 'BMS Executive',
  employee: 'Organiser',
};

// Compress image to ~max 800px width and JPEG quality 0.8
async function compressImage(file: File, maxDim = 800, quality = 0.8): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = dataUrl;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))), 'image/jpeg', quality);
  });
}

export default function MyProfile() {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [form, setForm] = useState({
    address: '',
    emergency_contact: '',
    alternate_phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('id, full_name, email, phone, username, profile_photo, address, emergency_contact, alternate_phone, joining_date, created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        toast.error('Failed to load profile');
      } else if (data) {
        setProfile(data);
        setForm({
          address: data.address || '',
          emergency_contact: data.emergency_contact || '',
          alternate_phone: data.alternate_phone || '',
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const phoneRe = /^[+\d][\d\s-]{6,19}$/;
    if (form.emergency_contact && !phoneRe.test(form.emergency_contact.trim())) {
      e.emergency_contact = 'Enter a valid phone number';
    }
    if (form.alternate_phone && !phoneRe.test(form.alternate_phone.trim())) {
      e.alternate_phone = 'Enter a valid phone number';
    }
    if (form.address && form.address.length > 500) {
      e.address = 'Address must be under 500 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    if (!validate()) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('employees')
      .update({
        address: form.address.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        alternate_phone: form.alternate_phone.trim() || null,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update profile');
      return;
    }
    setProfile({
      ...profile,
      address: form.address.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      alternate_phone: form.alternate_phone.trim() || null,
    });
    setEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleCancel = () => {
    if (!profile) return;
    setForm({
      address: profile.address || '',
      emergency_contact: profile.emergency_contact || '',
      alternate_phone: profile.alternate_phone || '',
    });
    setErrors({});
    setEditing(false);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const photoUrl = urlData.publicUrl;
      const { error: updErr } = await (supabase as any)
        .from('employees')
        .update({ profile_photo: photoUrl })
        .eq('id', user.id);
      if (updErr) throw updErr;
      setProfile((p) => (p ? { ...p, profile_photo: photoUrl } : p));
      toast.success('Profile photo updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleBack = () => {
    if (currentRole === 'admin') navigate('/admin');
    else if (currentRole === 'bdo') navigate('/bdo-dashboard');
    else if (currentRole === 'market_manager') navigate('/manager-dashboard');
    else if (currentRole === 'bms_executive') navigate('/bms-dashboard');
    else navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            My Profile
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        {/* Photo + Name */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                {profile?.profile_photo && <AvatarImage src={profile.profile_photo} alt="Profile" />}
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg disabled:opacity-50"
                aria-label="Upload photo"
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{profile?.full_name || '—'}</h2>
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[currentRole || 'employee'] || 'User'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Read-only fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={profile?.email || ''} readOnly disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <Input value={profile?.phone || '—'} readOnly disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Input
                value={ROLE_LABELS[currentRole || 'employee'] || 'User'}
                readOnly
                disabled
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Joining Date</Label>
              <Input
                value={
                  profile?.joining_date
                    ? new Date(profile.joining_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'
                }
                readOnly
                disabled
                className="mt-1 bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Editable fields */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Personal Details</CardTitle>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-8">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Profile
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8" disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!editing || saving}
                placeholder="Your full address"
                className="mt-1 min-h-[70px]"
                maxLength={500}
              />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Emergency Contact Number</Label>
              <Input
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                disabled={!editing || saving}
                placeholder="e.g. +91 98765 43210"
                className="mt-1"
                inputMode="tel"
                maxLength={20}
              />
              {errors.emergency_contact && (
                <p className="text-xs text-destructive mt-1">{errors.emergency_contact}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Alternate Phone Number</Label>
              <Input
                value={form.alternate_phone}
                onChange={(e) => setForm({ ...form, alternate_phone: e.target.value })}
                disabled={!editing || saving}
                placeholder="e.g. +91 91234 56789"
                className="mt-1"
                inputMode="tel"
                maxLength={20}
              />
              {errors.alternate_phone && (
                <p className="text-xs text-destructive mt-1">{errors.alternate_phone}</p>
              )}
            </div>

            {editing && (
              <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
