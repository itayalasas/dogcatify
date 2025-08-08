import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseClient, signIn, signUp, signOut } from '../lib/supabase';
import { User } from '../types';
import { NotificationService } from '../utils/notifications';
import { createEmailConfirmationToken, generateConfirmationUrl } from '../utils/emailConfirmation';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Periodic token validation
  useEffect(() => {
    if (!currentUser) return;

    const validateTokenPeriodically = async () => {
      const isValid = await checkTokenValidity();
      if (!isValid) {
        console.log('Token expired during periodic check, signing out...');
        await logout();
      }
    };

    // Check token validity every 5 minutes
    const interval = setInterval(validateTokenPeriodically, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (data) {
        const user: User = {
          id: data.id,
          email: data.email,
          displayName: data.display_name || '',
          photoURL: data.photo_url || undefined,
          isOwner: data.is_owner || true,
          isPartner: data.is_partner || false,
          createdAt: new Date(data.created_at),
          location: data.location || undefined,
          bio: data.bio || undefined,
          phone: data.phone || undefined,
          followers: data.followers || [],
          following: data.following || [],
          followersCount: (data.followers || []).length,
          followingCount: (data.following || []).length,
        };
        
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkTokenValidity = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Error checking token validity:', error);
        return false;
      }

      if (!session) {
        console.log('No active session found');
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      
      if (now >= expiresAt) {
        console.log('Token has expired');
        return false;
      }

      // Try to refresh the session if it's close to expiring (within 5 minutes)
      const timeUntilExpiry = expiresAt - now;
      if (timeUntilExpiry < 300) { // 5 minutes
        console.log('Token expiring soon, attempting refresh...');
        const { error: refreshError } = await supabaseClient.auth.refreshSession();
        
        if (refreshError) {
          console.error('Error refreshing session:', refreshError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in checkTokenValidity:', error);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        await loadUserProfile(data.user.id);
        
        // Save credentials for biometric authentication
        try {
          await AsyncStorage.setItem('@saved_credentials', JSON.stringify({
            email: email.toLowerCase().trim(),
            password
          }));
        } catch (storageError) {
          console.error('Error saving credentials:', storageError);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Starting registration process for:', email);
      
      // Step 1: Create user account WITHOUT email confirmation
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          emailRedirectTo: undefined, // Disable automatic email confirmation
          captchaToken: undefined,    // Disable captcha
        },
      });

      if (error) {
        console.error('Supabase registration error:', error);
        throw new Error(error.message);
      }

      console.log('User created in Supabase auth:', data.user?.id);

      // Step 2: Immediately sign out to prevent any automatic modals
      console.log('Signing out immediately to prevent modals...');
      await supabaseClient.auth.stopAutoRefresh();
      await supabaseClient.auth.signOut();
      setCurrentUser(null);

      // Step 3: Create profile in profiles table
      if (data.user) {
        console.log('Creating user profile...');
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email.toLowerCase().trim(),
            display_name: displayName.trim(),
            is_owner: true,
            is_partner: false,
            email_confirmed: false,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw new Error('Error al crear el perfil de usuario');
        }

        console.log('User profile created successfully');

        // Step 4: Send custom confirmation email
        try {
          console.log('Creating custom email confirmation token...');
          const token = await createEmailConfirmationToken(data.user.id, email.toLowerCase().trim(), 'signup');
          const confirmationUrl = generateConfirmationUrl(token, 'signup');

          console.log('Sending custom confirmation email...');
          await NotificationService.sendCustomConfirmationEmail(
            email.toLowerCase().trim(),
            displayName.trim(),
            confirmationUrl
          );

          console.log('Custom confirmation email sent successfully');
        } catch (emailError) {
          console.error('Error sending custom confirmation email:', emailError);
          // Don't throw error here - registration was successful
          console.log('Registration completed despite email error');
        }
      }

      console.log('Registration process completed successfully');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user...');
      
      // Clear saved credentials
      try {
        await AsyncStorage.removeItem('@saved_credentials');
      } catch (storageError) {
        console.error('Error clearing saved credentials:', storageError);
      }

      // Sign out from Supabase
      await supabaseClient.auth.signOut();
      setCurrentUser(null);
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateCurrentUser = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
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