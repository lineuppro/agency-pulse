import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'client' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  clientId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // FIRST check for existing session before setting up listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).finally(() => {
          setInitialized(true);
        });
      } else {
        setLoading(false);
        setInitialized(true);
      }
    });

    // THEN set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only process if we're already initialized to avoid race conditions
        if (!initialized && event === 'INITIAL_SESSION') {
          return; // Skip initial session event, we handle it above
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (newSession?.user) {
          setTimeout(() => {
            fetchUserRole(newSession.user.id);
          }, 0);
        } else {
          setRole(null);
          setClientId(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initialized]);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Fetch client_id from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', userId)
        .single();

      setRole((roleData?.role as UserRole) ?? null);
      setClientId(profileData?.client_id ?? null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
      setClientId(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setClientId(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      clientId,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
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
