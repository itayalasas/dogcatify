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

const SAVED_CREDENTIALS_KEY = '@saved_credentials';

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
          await handleUserSignIn(session.user);
        } else if (event === 'SIGNED_OUT') {
          handleUserSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed for user:', session.user.id);
          await handleUserSignIn(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Periodic token validation (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (currentUser) {
        const isValid = await checkTokenValidity();
        if (!isValid) {
          console.log('Token expired during periodic check, signing out...');
          await logout();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

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
        console.log('Existing session found for user:', session.user.id);
        await handleUserSignIn(session.user);
      } else {
        console.log('No existing session found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setLoading(false);
    }
  };

  const handleUserSignIn = async (user: any) => {
    try {
      console.log('Handling user sign in:', user.id);
      
      // Get user profile from Supabase
      const { data: profileData, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }

      if (profileData) {
        const userData: User = {
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

        setCurrentUser(userData);
        console.log('User profile loaded successfully');
      }
    } catch (error) {
      console.error('Error handling user sign in:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSignOut = () => {
    console.log('Handling user sign out');
    setCurrentUser(null);
    setLoading(false);
  };

  const checkTokenValidity = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error || !session) {
        console.log('No valid session found during token check');
        return false;
      }

      // Check if token is close to expiring (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes
          console.log('Token expires soon, attempting refresh...');
          
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabaseClient.auth.refreshSession();
          
          if (refreshError || !refreshedSession) {
            console.log('Token refresh failed:', refreshError);
            return false;
          }
          
          console.log('Token refreshed successfully');
        }
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
      
      // First check if user exists in profiles table
      const { data: existingUser, error: userCheckError } = await supabaseClient
        .from('profiles')
        .select('id, email, email_confirmed')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userCheckError) {
        if (userCheckError.code === 'PGRST116') {
          // User doesn't exist
          throw new Error('USER_NOT_FOUND');
        }
        throw userCheckError;
      }

      // Check if email is confirmed
      if (existingUser && !existingUser.email_confirmed) {
        throw new Error('EMAIL_NOT_CONFIRMED');
      }

      // Attempt to sign in
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        
        // Check specific error types
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('INVALID_PASSWORD');
        } else if (error.message?.includes('Email not confirmed')) {
          throw new Error('EMAIL_NOT_CONFIRMED');
        } else if (error.message?.includes('Too many requests')) {
          throw new Error('TOO_MANY_ATTEMPTS');
        }
        
        throw error;
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        
        // Save credentials for biometric login
        try {
          await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({
            email: email.toLowerCase().trim(),
            password: password
          }));
        } catch (storageError) {
          console.warn('Could not save credentials for biometric:', storageError);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Attempting registration for:', email);
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existingUser && !checkError) {
        throw new Error('USER_ALREADY_EXISTS');
      }

      // Register with Supabase Auth (NO emailRedirectTo to prevent modal)
      const { data, error } = await supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          // NO emailRedirectTo here to prevent the modal
        },
      });

      if (error) {
        console.error('Registration error:', error);
        throw error;
      }

      if (data.user) {
        console.log('User registered successfully:', data.user.id);
        
        // Create custom email confirmation token
        const token = await createEmailConfirmationToken(
          data.user.id, 
          email.toLowerCase().trim(), 
          'signup'
        );
        
        const confirmationUrl = generateConfirmationUrl(token, 'signup');
        
        // Send custom confirmation email
        await NotificationService.sendCustomConfirmationEmail(
          email.toLowerCase().trim(),
          displayName.trim(),
          confirmationUrl
        );
        
        console.log('Custom confirmation email sent');
        
        // Sign out immediately to prevent auto-login and modal
        await supabaseClient.auth.signOut();
        
        console.log('Registration completed successfully - user signed out to prevent modal');
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