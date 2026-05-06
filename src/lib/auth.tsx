import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { scheduleOverlayRecovery } from '@/lib/overlayRecovery';

export type UserRole = 'employee' | 'admin' | 'market_manager' | 'bms_executive' | 'bdo';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  currentRole: UserRole | null;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  const fetchAndSetRoles = useCallback(async (userId: string) => {
    try {
      console.log('Fetching roles for user:', userId);
      const { data: rolesData, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setUserRoles(['employee']);
        setCurrentRole('employee');
        setIsAdmin(false);
        return;
      }

      console.log('Roles fetched:', rolesData);
      const roles = (rolesData || []).map((r: any) => r.role as UserRole);
      setUserRoles(roles);

      const isAdminUser = roles.includes('admin');
      setIsAdmin(isAdminUser);

      if (roles.includes('admin')) {
        setCurrentRole('admin');
        console.log('Role set to: admin');
      } else if (roles.includes('bdo')) {
        setCurrentRole('bdo');
        console.log('Role set to: bdo');
      } else if (roles.includes('bms_executive')) {
        setCurrentRole('bms_executive');
        console.log('Role set to: bms_executive');
      } else if (roles.includes('market_manager')) {
        setCurrentRole('market_manager');
        console.log('Role set to: market_manager');
      } else if (roles.includes('employee')) {
        setCurrentRole('employee');
        console.log('Role set to: employee');
      } else {
        setCurrentRole('employee');
        setUserRoles(['employee']);
        console.log('No roles found, defaulting to employee');
      }
    } catch (error) {
      console.error('Error setting up user roles:', error);
      setCurrentRole('employee');
      setUserRoles(['employee']);
      setIsAdmin(false);
    }
  }, []);

  // Safety timeout for auth loading - prevent infinite loading state
  useEffect(() => {
    if (!loading) {
      // After auth loading completes, ensure no stuck overlay styles remain
      // (skeletons / radix portals can leave body pointer-events:none)
      scheduleOverlayRecovery();
      return;
    }
    const timer = setTimeout(() => {
      console.warn('Auth loading timed out after 15s, forcing load complete');
      setLoading(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid blocking auth state change
          setTimeout(() => fetchAndSetRoles(session.user.id), 0);
        } else {
          setIsAdmin(false);
          setCurrentRole(null);
          setUserRoles([]);
        }
      }
    );

    // Check for existing session with timeout + localStorage fallback
    // This prevents users being logged out on slow networks (LTE/PWA cold start)
    const restoreSession = async () => {
      try {
        // Race getSession against a 8s timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: Session | null }, error: any }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: { message: 'getSession timeout' } }), 8000)
        );
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]);

        console.log('Getting session:', { hasSession: !!session, error: sessionError });

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          await fetchAndSetRoles(session.user.id);
          setLoading(false);
          return;
        }

        // Fallback: read persisted session directly from localStorage
        // (Supabase stores it under a key like 'sb-<project>-auth-token')
        if (sessionError || !session) {
          try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            for (const k of keys) {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              const expiresAt = parsed?.expires_at ? parsed.expires_at * 1000 : 0;
              if (parsed?.access_token && expiresAt > Date.now()) {
                console.log('Restored session from localStorage fallback');
                // Trigger a non-blocking refresh; auth state listener will pick it up
                supabase.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token,
                }).catch(err => console.warn('setSession fallback failed:', err));
                // Optimistically set user so ProtectedRoute doesn't bounce to /auth
                if (parsed.user) {
                  setUser(parsed.user as User);
                  fetchAndSetRoles(parsed.user.id).catch(() => {});
                }
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('localStorage session fallback failed:', e);
          }
        }

        console.log('No session found, clearing user state');
        setIsAdmin(false);
        setCurrentRole(null);
        setUserRoles([]);
        setLoading(false);
      } catch (error) {
        console.error('Unhandled error in restoreSession:', error);
        setLoading(false);
      }
    };

    restoreSession();

    return () => subscription.unsubscribe();
  }, [fetchAndSetRoles]);

  const signIn = async (username: string, password: string) => {
    try {
      // Verify Supabase is configured
      if (!supabase) {
        return { error: { message: 'Authentication service is not configured. Please contact administrator.' } };
      }
      
      const trimmedUsername = username.trim();
      
      // Helper: sign in with timeout (30s for slow mobile networks)
      const signInWithTimeout = async (email: string, pwd: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const result = await supabase.auth.signInWithPassword({ email, password: pwd });
          clearTimeout(timeoutId);
          return result;
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err?.name === 'AbortError' || controller.signal.aborted) {
            return { data: { user: null, session: null }, error: { message: 'Login request timed out. Please check your internet connection and try again.' } };
          }
          throw err;
        }
      };

      // If username looks like an email, try direct auth first (fastest path)
      if (trimmedUsername.includes('@')) {
        try {
          const { data, error } = await signInWithTimeout(trimmedUsername, password);
          
          if (error) {
            return { error: { message: error.message || 'Invalid username or password.' } };
          }
          
          if (!data?.user) {
            return { error: { message: 'Authentication failed. Please try again.' } };
          }
          
          return { error: null };
        } catch (error: any) {
          return { error: { message: error?.message || 'Authentication failed. Please try again.' } };
        }
      }
      
        // For non-email usernames, try RPC function first (with quick timeout)
        let employee: { id: string; email: string; status: string; username: string } | null = null;
        
        let employeeData: any = null;
        let rpcError: any = null;
        
        try {
          // Quick timeout for RPC (3 seconds)
          const rpcResult = await Promise.race([
            (supabase as any).rpc('get_employee_by_username', { _username: trimmedUsername }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('RPC timeout')), 10000)
            )
          ]) as any;
          
          if (rpcResult && rpcResult.data !== undefined) {
            employeeData = rpcResult.data;
            rpcError = rpcResult.error;
          }
        } catch (error: any) {
          rpcError = error;
        }
        
        if (!rpcError && employeeData && employeeData.length > 0) {
          employee = employeeData[0] as any;
        } else {
          // Try direct query as fallback
          const { data: employeeQuery, error: queryError } = await (supabase as any)
            .from('employees')
            .select('id, email, status, username')
            .eq('username', trimmedUsername)
            .maybeSingle();
          
          if (queryError) {
            // If column doesn't exist or RLS blocks it, return error
            if (queryError.code === '42703' || queryError.message?.includes('does not exist')) {
              return { 
                error: { 
                  message: 'Database migration required. Please contact administrator.' 
                } 
              };
            }
            
            if (queryError.code === '42501' || queryError.message?.includes('policy')) {
              return { 
                error: { 
                  message: 'Authentication error. Please contact administrator.' 
                } 
              };
            }
            
            return { error: { message: 'Invalid username or password.' } };
          }
          
          employee = employeeQuery;
        }
        
        if (!employee) {
          return { error: { message: 'Invalid username or password.' } };
        }
        
        // Check if account is active
        if (employee.status !== 'active') {
          return { error: { message: 'Account is inactive. Please contact administrator.' } };
        }
        
        // Now sign in with email (stored in employees table) - using timeout helper
        const { data, error } = await signInWithTimeout(employee.email, password);
        
        if (error) {
          const msg = typeof error.message === 'string' ? error.message : 'Invalid username or password.';
          if (msg.includes('Invalid login credentials')) {
            return { error: { message: 'Invalid username or password.' } };
          }
          return { error: { message: msg } };
        }
        
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message || 'An unexpected error occurred. Please try again.' } };
      }
    };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });
    return { error };
  };

  const hasRole = (role: UserRole): boolean => {
    return userRoles.includes(role);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error (ignoring):', error);
      // Ignore errors - clear local state anyway
    }
    // Force clear local state
    setUser(null);
    setSession(null);
    setUserRoles([]);
    setCurrentRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin, currentRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Safety timeout to prevent infinite spinner
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse space-y-4 w-full max-w-md px-4">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="h-24 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Taking longer than expected...</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
