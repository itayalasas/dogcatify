import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Platform, Animated, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Fingerprint, CircleAlert as AlertCircle, X, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBiometric } from '../../contexts/BiometricContext';
import { resendConfirmationEmail } from '../../utils/emailConfirmation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_CREDENTIALS_KEY = '@saved_credentials';

// Componente de error moderno
const ErrorBanner = ({ error, onDismiss }: { error: string; onDismiss: () => void }) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const getErrorMessage = (errorText: string) => {
    if (errorText.includes('Invalid login credentials')) {
      return {
        title: 'Credenciales incorrectas',
        message: 'El correo electrónico o la contraseña no son correctos. Verifica e intenta nuevamente.',
        icon: <AlertCircle size={20} color="#EF4444" />
      };
    } else if (errorText.includes('Email not confirmed')) {
      return {
        title: 'Email no confirmado',
        message: 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
        icon: <Mail size={20} color="#F59E0B" />
      };
    } else if (errorText.includes('Too many requests')) {
      return {
        title: 'Demasiados intentos',
        message: 'Has intentado muchas veces. Espera unos minutos antes de intentar nuevamente.',
        icon: <AlertCircle size={20} color="#F59E0B" />
      };
    } else if (errorText.includes('User not found')) {
      return {
        title: 'Usuario no encontrado',
        message: 'No existe una cuenta con este correo electrónico. ¿Quizás necesitas registrarte?',
        icon: <AlertCircle size={20} color="#3B82F6" />
      };
    } else {
      return {
        title: 'Error de conexión',
        message: 'Hubo un problema al conectar. Verifica tu conexión e intenta nuevamente.',
        icon: <AlertCircle size={20} color="#EF4444" />
      };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <Animated.View style={[styles.errorBanner, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          {errorInfo.icon}
        </View>
        <View style={styles.errorText}>
          <Text style={styles.errorTitle}>{errorInfo.title}</Text>
          <Text style={styles.errorMessage}>{errorInfo.message}</Text>
        </View>
        <TouchableOpacity style={styles.errorDismiss} onPress={handleDismiss}>
          <X size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [biometricPromptShown, setBiometricPromptShown] = useState(false);
  const { login, authError, clearAuthError } = useAuth();
  const { t } = useLanguage();
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    biometricType, 
    authenticateWithBiometric
  } = useBiometric();

  // Load saved credentials on component mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Auto-trigger biometric authentication when available
  useEffect(() => {
    if (isBiometricEnabled && isBiometricSupported && !biometricPromptShown && !loading) {
      console.log('Biometric available and enabled, triggering automatic authentication...');
      setBiometricPromptShown(true);
      handleAutomaticBiometricLogin();
    }
  }, [isBiometricEnabled, isBiometricSupported, biometricPromptShown, loading]);

  // Handle auth errors from context
  useEffect(() => {
    if (authError) {
      if (authError.startsWith('EMAIL_NOT_CONFIRMED:')) {
        const userEmail = authError.split(':')[1];
        setPendingEmail(userEmail || email);
        setShowEmailConfirmationModal(true);
      } else {
        setLoginError(authError);
      }
    }
  }, [authError]);

  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await AsyncStorage.getItem(SAVED_CREDENTIALS_KEY);
      if (savedCredentials) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(savedCredentials);
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberCredentials(true);
          console.log('Loaded saved credentials for:', savedEmail);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (email: string, password: string) => {
    try {
      const credentials = { email, password };
      await AsyncStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify(credentials));
      console.log('Credentials saved successfully');
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const clearSavedCredentials = async () => {
    try {
      await AsyncStorage.removeItem(SAVED_CREDENTIALS_KEY);
      console.log('Saved credentials cleared');
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };

  const handleAutomaticBiometricLogin = async () => {
    try {
      console.log('Attempting automatic biometric authentication...');
      const credentials = await authenticateWithBiometric();
      if (credentials) {
        console.log('Biometric authentication successful, logging in...');
        setEmail(credentials.email);
        setPassword(credentials.password);
        // Auto-login with biometric credentials
        await handleLogin(credentials.email, credentials.password);
      } else {
        console.log('Biometric authentication cancelled or failed');
        // Reset the flag so user can try again if they want
        setBiometricPromptShown(false);
      }
    } catch (error) {
      console.log('Biometric authentication error:', error);
      setBiometricPromptShown(false);
    }
  };

  const handleManualBiometricLogin = async () => {
    try {
      const credentials = await authenticateWithBiometric();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        // Auto-login with biometric credentials
        handleLogin(credentials.email, credentials.password);
      }
    } catch (error) {
      console.log('Manual biometric authentication cancelled or failed');
    }
  };

  const handleLogin = async (emailParam?: string, passwordParam?: string) => {
    const loginEmail = emailParam || email;
    const loginPassword = passwordParam || password;

    if (!loginEmail || !loginPassword) {
      setLoginError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setLoginError(null);
    clearAuthError();

    try {
      console.log('Attempting login with credentials:', loginEmail);
      const result = await login(loginEmail, loginPassword);
      
      if (result) {
        console.log('Login successful');
        
        // Save credentials if user opted to remember them
        if (rememberCredentials) {
          await saveCredentials(loginEmail, loginPassword);
        } else {
          // Clear saved credentials if user unchecked the option
          await clearSavedCredentials();
        }
        
        // Check if should show biometric setup (only for manual login, not biometric login)
        if (isBiometricSupported && !isBiometricEnabled && !emailParam && !passwordParam) {
          // Navigate to biometric setup screen for manual login
          router.replace({
            pathname: '/auth/biometric-setup',
            params: { 
              email: loginEmail, 
              password: loginPassword,
              userName: result.displayName || 'Usuario'
            }
          });
        } else {
          // Go directly to main app (for biometric login or when biometric already configured)
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Don't show error banner for email confirmation errors - the modal will handle it
      if (!error.message?.includes('confirmar tu correo')) {
        setLoginError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingEmail) {
      return;
    }

    setResendingEmail(true);
    try {
      const result = await resendConfirmationEmail(pendingEmail);
      if (result.success) {
        // Close modal first
        setShowEmailConfirmationModal(false);
        clearAuthError();
        
        // Show success banner instead of alert
        setLoginError(null);
        
        // Clear form and show success message
        setEmail('');
        setPassword('');
        setPendingEmail('');
        
        // Show success message
        Alert.alert(
          'Correo enviado',
          `Se ha enviado un nuevo correo de confirmación a ${pendingEmail}. Revisa tu bandeja de entrada.`,
          [{ text: 'Entendido' }]
        );
      } else {
        setLoginError(result.error || 'No se pudo reenviar el correo');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      setLoginError('No se pudo reenviar el correo de confirmación');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCloseEmailModal = () => {
    setShowEmailConfirmationModal(false);
    clearAuthError();
    // Clear form when closing modal
    setEmail('');
    setPassword('');
    setPendingEmail('');
  };

  const dismissError = () => {
    setLoginError(null);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.jpg')} 
            style={styles.logo} 
          />
          <Text style={styles.title}>¡Bienvenido de vuelta a DogCatiFy! 🐾</Text>
          <Text style={styles.subtitle}>Inicia sesión para conectar con tu comunidad de mascotas</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Correo electrónico"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={20} color="#6B7280" />}
          />

          <Input
            label="Contraseña"
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={20} color="#6B7280" />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            }
          />

          {/* Error Banner - Solo se renderiza cuando hay error */}
          {loginError && (
            <ErrorBanner 
              error={loginError} 
              onDismiss={dismissError}
            />
          )}

          <View style={styles.rememberCredentialsContainer}>
            <TouchableOpacity 
              style={styles.rememberCredentialsRow} 
              onPress={() => setRememberCredentials(!rememberCredentials)}
            >
              <View style={[styles.checkbox, rememberCredentials && styles.checkedCheckbox]}>
                {rememberCredentials && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberCredentialsText}>
                Recordar mis credenciales
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Iniciar sesión"
            onPress={() => handleLogin()}
            loading={loading}
            disabled={loading}
            size="large"
          />

          {/* Manual Biometric Login Button - Solo si biometría está habilitada */}
          {isBiometricEnabled && isBiometricSupported && (
            <TouchableOpacity 
              style={styles.biometricButton}
              onPress={handleManualBiometricLogin}
              disabled={loading}
            >
              <Fingerprint size={24} color="#2D6A6F" />
              <Text style={styles.biometricButtonText}>
                Iniciar con {biometricType || 'Biometría'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.forgotPasswordContainer}>
            <Link href="/auth/forgot-password" style={styles.forgotPasswordLink}>
              ¿Olvidaste tu contraseña?
            </Link>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿No tienes una cuenta?{' '}
            <Link href="/auth/register" style={styles.link}>
              Registrarse
            </Link>
          </Text>
        </View>
      </ScrollView>

      {/* Email Confirmation Modal */}
      <Modal
        visible={showEmailConfirmationModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEmailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📧 Confirma tu correo</Text>
            </View>
            
            <Text style={styles.modalText}>
              Para continuar, debes confirmar tu correo electrónico.
            </Text>
            
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Email:</Text>
              <Text style={styles.emailValue}>{pendingEmail}</Text>
            </View>
            
            <Text style={styles.modalInstructions}>
              Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de confirmación.
            </Text>
            
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={handleCloseEmailModal}
                variant="outline"
                size="large"
                style={styles.modalButton}
              />
              <Button
                title={resendingEmail ? 'Enviando...' : 'Reenviar correo'}
                onPress={handleResendEmail}
                loading={resendingEmail}
                size="large"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  
  // Error Banner Styles - Solo ocupa espacio cuando existe
  errorBanner: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 18,
  },
  errorDismiss: {
    padding: 2,
    marginLeft: 4,
  },
  
  rememberCredentialsContainer: {
    marginBottom: 16,
  },
  rememberCredentialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedCheckbox: {
    backgroundColor: '#2D6A6F',
    borderColor: '#2D6A6F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberCredentialsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#2D6A6F',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordLink: {
    color: '#3B82F6',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  link: {
    color: '#3B82F6',
    fontFamily: 'Inter-SemiBold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  emailContainer: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  emailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E40AF',
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  modalInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  modalButton: {
    width: '100%',
  },
});