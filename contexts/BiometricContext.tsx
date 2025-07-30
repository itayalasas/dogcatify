import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { supabaseClient } from '../lib/supabase';

interface BiometricContextType {
  isBiometricAvailable: boolean;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  biometricType: string | null;
  checkBiometricStatus: () => Promise<void>;
  enableBiometric: (email: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<{ email: string; password: string } | null>;
  getStoredCredentials: () => Promise<{ email: string; password: string } | null>;
}

const BiometricContext = createContext<BiometricContextType | undefined>(undefined);

export const useBiometric = () => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
};

export const BiometricProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
    checkBiometricEnabled();
  }, [currentUser]);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const available = compatible && enrolled;
      setIsBiometricAvailable(available);
      setIsBiometricSupported(available);
      
      if (available) {
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        } else {
          setBiometricType('biometría');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsBiometricAvailable(false);
      setIsBiometricSupported(false);
      setBiometricType(null);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      if (!currentUser) {
        setIsBiometricEnabled(false);
        return;
      }

      // Check if biometric is enabled in user profile
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('biometric_enabled')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        // If column doesn't exist, gracefully handle it
        if (error.code === '42703') {
          console.log('Biometric column not yet available in database');
          setIsBiometricEnabled(false);
          return;
        }
        console.error('Error checking biometric status:', error);
        setIsBiometricEnabled(false);
        return;
      }

      const isEnabled = data?.biometric_enabled || false;
      setIsBiometricEnabled(isEnabled);
      
      console.log('Biometric enabled status:', isEnabled);
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      setIsBiometricEnabled(false);
    }
  };

  const checkBiometricStatus = async () => {
    await checkBiometricAvailability();
    await checkBiometricEnabled();
  };

  const enableBiometric = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Starting biometric setup...');
      
      if (!isBiometricAvailable) {
        throw new Error('Biometric authentication is not available');
      }

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Authenticate with biometric first
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Configura tu autenticación biométrica',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
      });

      if (!result.success) {
        console.log('Biometric authentication failed or cancelled');
        return false;
      }

      console.log('Biometric authentication successful, storing credentials...');

      // Store credentials securely
      await SecureStore.setItemAsync('biometric_email', email);
      await SecureStore.setItemAsync('biometric_password', password);
      
      console.log('Credentials stored, updating user profile...');

      // Update user profile in Supabase
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          biometric_enabled: true,
          biometric_enabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating biometric status in Supabase:', error);
        // Clean up stored credentials if database update fails
        await SecureStore.deleteItemAsync('biometric_email');
        await SecureStore.deleteItemAsync('biometric_password');
        throw error;
      }

      console.log('Biometric setup completed successfully');
      setIsBiometricEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      // Clean up any stored credentials on error
      try {
        await SecureStore.deleteItemAsync('biometric_email');
        await SecureStore.deleteItemAsync('biometric_password');
      } catch (cleanupError) {
        console.error('Error cleaning up credentials:', cleanupError);
      }
      throw error;
    }
  };

  const disableBiometric = async (): Promise<void> => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Remove stored credentials
      await SecureStore.deleteItemAsync('biometric_email');
      await SecureStore.deleteItemAsync('biometric_password');

      // Update user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          biometric_enabled: false,
          biometric_enabled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setIsBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  };

  const authenticateWithBiometric = async (): Promise<{ email: string; password: string } | null> => {
    try {
      if (!isBiometricAvailable || !isBiometricEnabled) {
        return null;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentícate para iniciar sesión',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        return await getStoredCredentials();
      }
      
      return null;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return null;
    }
  };

  const getStoredCredentials = async (): Promise<{ email: string; password: string } | null> => {
    try {
      const email = await SecureStore.getItemAsync('biometric_email');
      const password = await SecureStore.getItemAsync('biometric_password');

      if (email && password) {
        return { email, password };
      }

      return null;
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  };

  return (
    <BiometricContext.Provider
      value={{
        isBiometricAvailable,
        isBiometricSupported,
        isBiometricEnabled,
        biometricType,
        checkBiometricStatus,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
        getStoredCredentials,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
};