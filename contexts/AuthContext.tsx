import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient, signIn, signUp, signOut, updateUserProfile } from '../lib/supabase';
import { User } from '../types';
import { NotificationService } from '../utils/notifications';
import { createEmailConfirmationToken, generateConfirmationUrl } from '../utils/emailConfirmation';

interface AuthContextType {
  currentUser: User | null;
  session: any;
  loading: boolean;
  isEmailConfirmed: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
  checkTokenValidity: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const SAVED_CREDENTIALS_KEY = '@saved_credentials';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
          setIsEmailConfirmed(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Periodic token validation
  useEffect(() => {
    if (!session) return;

    const validateToken = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabaseClient.auth.getSession();
        
        if (error || !currentSession) {
          console.log('Token validation failed, signing out...');
          await logout();
        }
      } catch (error) {
        console.error('Error validating token:', error);
        await logout();
      }
    };

    // Check token validity every 5 minutes
    const interval = setInterval(validateToken, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session]);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId);
      const { data: profileData, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          console.log('JWT expired during profile load, signing out...');
          await logout();
          return;
        }
        throw error;
      }

      if (profileData) {
        const user: User = {
          id: profileData.id,
          email: profileData.email,
          displayName: profileData.display_name || '',
          photoURL: profileData.photo_url || undefined,
          isOwner: profileData.is_owner || true,
          isPartner: profileData.is_partner || false,
          createdAt: new Date(profileData.created_at),
          location: profileData.location || undefined,
          bio: profileData.bio || undefined,
          phone: profileData.phone || undefined,
          followers: profileData.followers || [],
          following: profileData.following || [],
          followersCount: (profileData.followers || []).length,
          followingCount: (profileData.following || []).length,
        };

        setCurrentUser(user);
        setIsEmailConfirmed(profileData.email_confirmed || false);
        
        console.log('User profile loaded successfully:', user.displayName);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTokenValidity = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error || !session) {
        console.log('Token validation failed');
        return false;
      }
      
      // Check if token is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // Less than 5 minutes
        console.log('Token expires soon, refreshing...');
        const { data: { session: newSession }, error: refreshError } = await supabaseClient.auth.refreshSession();
        
        if (refreshError || !newSession) {
          console.log('Token refresh failed');
          return false;
        }
        
        setSession(newSession);
        console.log('Token refreshed successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error('Login error:', error);
        
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('❌ Email o contraseña incorrectos');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('📧 Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('⏰ Demasiados intentos. Espera unos minutos antes de intentar nuevamente.');
        } else {
          throw new Error(`❌ Error al iniciar sesión: ${error.message}`);
        }
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        
        // Save credentials for biometric authentication
        try {
          await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ email, password }));
        } catch (storageError) {
          console.warn('Could not save credentials for biometric auth:', storageError);
        }
        
        // Load user profile
        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Attempting registration for:', email, displayName);
      
      // Register with Supabase WITHOUT email confirmation redirect
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          // CRITICAL: No emailRedirectTo to prevent modal
          emailRedirectTo: undefined
        },
      });
      
      if (error) {
        console.error('Registration error:', error);
        
        if (error.message?.includes('User already registered')) {
          throw new Error('📧 Ya existe una cuenta con este email. ¿Quieres iniciar sesión?');
        } else if (error.message?.includes('Password should be at least')) {
          throw new Error('🔒 La contraseña debe tener al menos 6 caracteres');
        } else if (error.message?.includes('Invalid email')) {
          throw new Error('📧 El formato del email no es válido');
        } else {
          throw new Error(`❌ Error en el registro: ${error.message}`);
        }
      }

      if (data.user) {
        console.log('Registration successful for user:', data.user.id);
        
        // CRITICAL: Sign out immediately to prevent auto-login and modal
        await supabaseClient.auth.signOut();
        setCurrentUser(null);
        setSession(null);
        setIsEmailConfirmed(false);
        
        console.log('User signed out immediately after registration');
        
        // Send custom confirmation email
        try {
          console.log('Sending custom confirmation email...');
          const token = await createEmailConfirmationToken(data.user.id, email.toLowerCase().trim(), 'signup');
          const confirmationUrl = generateConfirmationUrl(token, 'signup');
          
          await NotificationService.sendCustomConfirmationEmail(
            email.toLowerCase().trim(),
            displayName.trim(),
            confirmationUrl
          );
          
          console.log('Custom confirmation email sent successfully');
        } catch (emailError) {
          console.error('Error sending custom confirmation email:', emailError);
          // Continue with registration even if email fails
        }
        
        console.log('Registration process completed successfully');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      await signOut();
      
      // Clear saved credentials
      try {
        await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
      } catch (storageError) {
        console.warn('Could not clear saved credentials:', storageError);
      }
      
      setCurrentUser(null);
      setSession(null);
      setIsEmailConfirmed(false);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      setCurrentUser(null);
      setSession(null);
      setIsEmailConfirmed(false);
    }
  };

  const updateCurrentUser = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        loading,
        isEmailConfirmed,
        login,
        register,
        logout,
        updateCurrentUser,
        checkTokenValidity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};