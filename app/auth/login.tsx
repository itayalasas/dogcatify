import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Check, Fingerprint } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBiometric } from '../../contexts/BiometricContext'; 
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login() {
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricOption, setShowBiometricOption] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    biometricType, 
    enableBiometric, 
    authenticateWithBiometric,
    checkBiometricStatus
  } = useBiometric();

  // Check for biometric availability on component mount
  React.useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric availability:', { compatible, enrolled });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // Cargar credenciales guardadas al iniciar
  React.useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('remembered_email');
        const savedPassword = await AsyncStorage.getItem('remembered_password');
        
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberPassword(true);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    };
    
    loadSavedCredentials();
  }, []);

  React.useEffect(() => {
    // Check biometric status when component mounts
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  const handleLogin = async () => {
    // If biometric is enabled and supported, try biometric first
    if (isBiometricEnabled && isBiometricSupported) {
      try {
        console.log('Attempting biometric login first...');
        const biometricResult = await handleBiometricLogin();
        if (biometricResult) {
          console.log('Biometric login successful');
          return; // Biometric login successful
        }
      } catch (error) {
        console.log('Biometric login failed, continuing with credentials');
        // Continue with credential validation
      }
    }

    // Validate credentials are provided
    if (!email || !password) {
      Alert.alert(t('error'), 'Por favor completa el correo electrónico y la contraseña');
      return;
    }
    
    // Guardar credenciales si rememberPassword está activado
    if (rememberPassword) {
      try {
        await AsyncStorage.setItem('remembered_email', email);
        // No guardar la contraseña en texto plano en producción
        // Esto es solo para demostración
        await AsyncStorage.setItem('remembered_password', password);
      } catch (error) {
        console.error('Error saving credentials:', error);
      }
    } else {
      // Limpiar credenciales guardadas
      try {
        await AsyncStorage.removeItem('remembered_email');
        await AsyncStorage.removeItem('remembered_password');
      } catch (error) {
        console.error('Error removing credentials:', error);
      }
    }

    // Proceed with credential login
    await handleCredentialLogin();
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      console.log('Starting Google login...');
      const result = await loginWithGoogle();
      
      if (result) {
        // Redirect based on user type
        const isAdmin = result?.email?.toLowerCase() === 'admin@dogcatify.com';
        if (isAdmin) {
          router.replace('/(admin-tabs)/requests');
        } else {
          if (redirectTo) {
            router.replace(`/${redirectTo}` as any);
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión con Google. Intenta nuevamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled || !isBiometricSupported) {
      Alert.alert('Biometría no disponible', 'La autenticación biométrica no está configurada o no está disponible en este dispositivo.');
      return;
    }

    setBiometricLoading(true);
    try {
      console.log('Starting biometric login...');
      const credentials = await authenticateWithBiometric();
      
      if (credentials) {
        console.log('Biometric authentication successful, logging in...');
        const result = await login(credentials.email, credentials.password);
        
        if (result) {
          const isAdmin = result?.email?.toLowerCase() === 'admin@dogcatify.com';
          if (isAdmin) {
            router.replace('/(admin-tabs)/requests');
          } else {
            if (redirectTo) {
              router.replace(`/${redirectTo}` as any);
            } else {
              router.replace('/(tabs)');
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'No se pudo autenticar con biometría. Intenta con tu correo y contraseña.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleCredentialLogin = async () => {
    setLoading(true);
    try {
      console.log('Attempting login with credentials:', email);
      try {
        const result = await login(email, password);
        
        if (result) {
          // Show biometric setup option after successful login
          if (isBiometricSupported && !isBiometricEnabled && email && password) {
            setShowBiometricOption(true);
          } else {
            // Redirect based on user type after successful login
            const isAdmin = result?.email?.toLowerCase() === 'admin@dogcatify.com';
            if (isAdmin) {
              console.log('Admin login, redirecting to admin tabs');
              router.replace('/(admin-tabs)/requests');
            } else {
              console.log('Regular user login, redirecting to regular tabs');
              // Verificar si hay un deep link pendiente
              if (redirectTo) {
                console.log('Redirecting to deep link after login:', redirectTo);
                router.replace(`/${redirectTo}` as any);
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Login error details:', error);
        
        // Manejar errores específicos de autenticación
        if (error.message.includes('confirma tu correo')) {
          Alert.alert(
            'Correo no confirmado',
            'Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
            [
              { 
                text: 'Reenviar correo', 
                onPress: async () => {
                  try {
                    await supabaseClient.auth.resend({
                      type: 'signup',
                      email: email,
                      options: {
                        emailRedirectTo: 'https://dogcatify.com/auth/login',
                      }
                    });
                    Alert.alert('Correo enviado', 'Se ha enviado un nuevo correo de confirmación');
                  } catch (resendError) {
                    console.error('Error resending confirmation email:', resendError);
                    Alert.alert('Error', 'No se pudo reenviar el correo de confirmación');
                  }
                }
              },
              { text: 'Entendido', style: 'default' }
            ]
          );
        } else if (error.message.includes('Invalid login credentials') || 
                   error.message.includes('invalid_credentials') ||
                   error.message.includes('Invalid email or password')) {
          Alert.alert(
            'Credenciales incorrectas',
            'El correo electrónico o la contraseña son incorrectos. Por favor verifica tus datos e intenta nuevamente.',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Correo no confirmado',
            'Tu cuenta aún no ha sido confirmada. Por favor revisa tu correo electrónico y confirma tu cuenta.',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else if (error.message.includes('Too many requests')) {
          Alert.alert(
            'Demasiados intentos',
            'Has realizado demasiados intentos de inicio de sesión. Por favor espera unos minutos antes de intentar nuevamente.',
            [{ text: 'Entendido', style: 'default' }]
          );
        } else if (error.message.includes('User not found')) {
          Alert.alert(
            'Usuario no encontrado',
            'No existe una cuenta con este correo electrónico. ¿Deseas crear una cuenta nueva?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Crear cuenta', 
                onPress: () => router.push('/auth/register')
              }
            ]
          );
        } else {
          Alert.alert(
            'Error de inicio de sesión',
            'Ocurrió un error al intentar iniciar sesión. Por favor verifica tu conexión a internet e intenta nuevamente.',
            [{ text: 'Entendido', style: 'default' }]
          );
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    console.log('Attempting to enable biometric with credentials');
    const success = await enableBiometric(email, password);
    if (success) {
      console.log('Biometric successfully enabled');
      Alert.alert(
        'Autenticación biométrica habilitada',
        `Ahora puedes usar tu ${biometricType || 'biometría'} para iniciar sesión rápidamente. Esta opción aparecerá la próxima vez que inicies la aplicación.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              const isAdmin = email.toLowerCase() === 'admin@dogcatify.com';
              if (isAdmin) {
                router.replace('/(admin-tabs)/requests');
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        ]
      );
      setShowBiometricOption(false);
    } else {
      console.error('Failed to enable biometric');
      Alert.alert('Error', 'No se pudo habilitar la autenticación biométrica');
      // Redirect even if biometric setup failed
      if (email === 'admin@dogcatify.com') {
        router.replace('/(admin-tabs)/requests');
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const skipBiometricSetup = () => {
    setShowBiometricOption(false);
    // Redirect when skipping biometric setup
    const isAdmin = email.toLowerCase() === 'admin@dogcatify.com';
    if (isAdmin) {
      router.replace('/(admin-tabs)/requests');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo.jpg')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>¡Bienvenido de vuelta!</Text>
        <Text style={styles.subtitle}>{t('signInSubtitle')}</Text>
      </View>

      <View style={styles.form}>

        <Input
          label={t('email')}
          placeholder={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color="#6B7280" />}
        />

        <Input
          label={t('password')}
          placeholder={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          leftIcon={<Lock size={20} color="#6B7280" />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
            </TouchableOpacity>
          }
        />

        <View style={styles.rememberContainer}>
          <TouchableOpacity 
            style={styles.rememberRow} 
            onPress={() => setRememberPassword(!rememberPassword)}
          >
            <View style={[styles.checkbox, rememberPassword && styles.checkedCheckbox]}>
              {rememberPassword && <Check size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.rememberText}>Recordar contraseña</Text>
          </TouchableOpacity>
        </View>

        <Button
          title={t('signIn')}
          onPress={handleLogin}
          loading={loading}
          size="large"
        />

        {/* Social Login Options */}
        <View style={styles.socialLoginSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.socialButtons}>
            {/* Google Login */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleIcon}
              />
              <Text style={styles.socialButtonText}>
                {googleLoading ? 'Conectando...' : 'Google'}
              </Text>
            </TouchableOpacity>

            {/* Biometric Login */}
            {isBiometricSupported && isBiometricEnabled && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
              >
                <Fingerprint size={20} color="#6B7280" />
                <Text style={styles.socialButtonText}>
                  {biometricLoading ? 'Autenticando...' : biometricType || 'Biometría'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Biometric Setup Option */}
        {showBiometricOption && (
          <View style={styles.biometricSetup}>
            <Text style={styles.biometricSetupTitle} numberOfLines={2}>
              🔒 Habilitar acceso rápido
            </Text>
            <Text style={styles.biometricSetupText} numberOfLines={3}>
              ¿Quieres usar tu {biometricType} para iniciar sesión más rápido la próxima vez?
            </Text>
            <View style={styles.biometricSetupButtons}>
              <View style={styles.biometricButton}>
                <Button title="Ahora no" onPress={skipBiometricSetup} variant="outline" size="small" />
              </View>
              <View style={styles.biometricButton}>
                <Button title="Habilitar" onPress={handleEnableBiometric} size="small" />
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('dontHaveAccount')}{' '}
            <Link href="/auth/register" style={styles.link}>
              {t('signUp')}
            </Link>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 30, // Add padding at the top to show status bar
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 20,
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
  footer: {
    alignItems: 'center',
    marginTop: 24,
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
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rememberText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  socialLoginSection: {
    marginTop: 24,
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    paddingHorizontal: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  biometricSetup: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    width: '100%',
  },
  biometricSetupTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  biometricSetupText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  biometricSetupButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  biometricButton: {
    flex: 1,
    maxWidth: '48%',
  },
});