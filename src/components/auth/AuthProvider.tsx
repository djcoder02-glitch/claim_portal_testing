import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Mock admin user for development
  const mockAdminUser: User = {
    id: 'admin-123',
    email: 'admin@claimcraft.com',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { role: 'admin' },
    user_metadata: { name: 'Admin User' },
    aud: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    recovery_sent_at: null,
    email_change: null,
    new_email: null,
    invited_at: null,
    action_link: null,
    email_change_sent_at: null,
    email_change_confirm_status: 0,
    banned_until: null,
    reauthentication_sent_at: null,
    is_anonymous: false,
    factors: null,
    identities: []
  } as User;

  const mockSession: Session = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: mockAdminUser
  };

  const [user] = useState<User | null>(mockAdminUser);
  const [session] = useState<Session | null>(mockSession);
  const [loading] = useState(false);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};