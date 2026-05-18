import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import wingrowLogo from '@/assets/wingrow-logo-optimized.png';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waitingForRole, setWaitingForRole] = useState(false);
  const { signIn, signUp, user, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (authLoading) return;
    if (user && currentRole) {
      const routes: Record<string, string> = {
        admin: '/admin',
        market_manager: '/manager-dashboard',
        bms_executive: '/bms-dashboard',
      };
      navigate(routes[currentRole] || '/dashboard', { replace: true });
      setWaitingForRole(false);
    } else if (user && !currentRole) {
      setWaitingForRole(true);
    }
  }, [user, currentRole, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        if (!username.trim()) {
          toast.error(t('auth.usernameRequired'));
          setSubmitting(false);
          return;
        }
        if (!password.trim()) {
          toast.error(t('auth.passwordRequired'));
          setSubmitting(false);
          return;
        }
        try {
          const result = await signIn(username, password);
          if (result.error) {
            toast.error(result.error.message || t('auth.loginFailed'));
          } else {
            toast.success(t('auth.loginSuccess'));
            setWaitingForRole(true);
          }
        } catch (error: any) {
          toast.error(error.message || t('auth.loginFailed'));
        }
      } else {
        if (!fullName.trim() || !username.trim()) {
          toast.error(t('auth.fillRequired'));
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, username);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t('auth.accountCreated'));
          setIsLogin(true);
          setUsername('');
          setEmail('');
          setPassword('');
          setFullName('');
        }
      }
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Safety timeout for waiting state
  useEffect(() => {
    if (!waitingForRole) return;
    const timer = setTimeout(() => {
      console.warn('Role loading timed out, refreshing');
      window.location.reload();
    }, 12000);
    return () => clearTimeout(timer);
  }, [waitingForRole]);

  if (authLoading || waitingForRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="space-y-3 w-64 mx-auto">
            <div className="h-24 w-24 bg-muted rounded-full mx-auto animate-pulse" />
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 mx-auto animate-pulse" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {waitingForRole ? t('common.signingIn') : t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={wingrowLogo} alt="Wingrow Market" className="h-24 w-auto" width="96" height="96" fetchPriority="high" decoding="async" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </CardTitle>
          <CardDescription>
            {isLogin ? t('auth.loginDescription') : t('auth.signupDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required={!isLogin} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required={!isLogin} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input id="username" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required={!isLogin} />
                </div>
              </>
            )}
            {isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input id="username" placeholder={t('auth.enterUsername')} value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" placeholder={t('auth.enterPassword')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('common.pleaseWait') : isLogin ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-accent hover:underline">
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
