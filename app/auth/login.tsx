import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Mail, Lock, Fingerprint } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBiometric } from '../../contexts/BiometricContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  const { login } = useAuth();
  const { t } = useLanguage();
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    biometricType, 
    authenticateWithBiometric 
  } = useBiometric();

  // Auto-attempt biometric login when screen loads
  useEffect(() => {
    if (isBiometricEnabled && isBiometricSupported) {
      // Small delay to let the screen render first
      setTimeout(() => {
        handleBiometricLogin();
      }, 1000);
    }
  }, [isBiometricEnabled, isBiometricSupported]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      
      // Check if user is admin
      if (email.toLowerCase() === 'admin@dogcatify.com') {
        router.replace('/(admin-tabs)/requests');
      } else {
        // Check if biometric is supported and not yet enabled
        if (isBiometricSupported && !isBiometricEnabled) {
          // Navigate to biometric setup
          router.replace({
            pathname: '/auth/biometric-setup',
            params: {
              email: email,
              password: password,
              userName: email.split('@')[0]
            }
          });
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.log('Login error:', error.message);
      
      // Check if it's an email confirmation error
      if (error.message?.includes('confirmar tu correo') || 
          error.message?.includes('email') && error.message?.includes('confirm')) {
        Alert.alert(
          'Email no confirmado',
          'Debes confirmar tu correo electrónico antes de iniciar sesión.\n\n¿Quieres que reenviemos el email de confirmación?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Reenviar email', 
              onPress: handleResendConfirmation 
            }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico primero');
      return;
    }

    setResendingEmail(true);
    try {
      console.log('Resending confirmation email for:', email);
      
      // Call our resend function
      const { resendConfirmationEmail } = await import('../../utils/emailConfirmation');
      const result = await resendConfirmationEmail(email.toLowerCase().trim());
      
      if (result.success) {
        Alert.alert(
          '✅ Email reenviado',
          `Se ha enviado un nuevo enlace de confirmación a:\n${email}\n\nPor favor revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace.\n\nEl enlace expira en 24 horas.`,
          [{ text: 'Entendido' }]
        );
      } else {
        Alert.alert('Error', result.error || 'No se pudo reenviar el email de confirmación');
      }
    } catch (error: any) {
      console.error('Error resending confirmation email:', error);
      Alert.alert('Error', 'No se pudo reenviar el email de confirmación');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled || !isBiometricSupported) return;
    
    setBiometricLoading(true);
    try {
      const credentials = await authenticateWithBiometric();
      
      if (credentials) {
        console.log('Biometric authentication successful, logging in...');
        await login(credentials.email, credentials.password);
        
        // Check if user is admin
        if (credentials.email.toLowerCase() === 'admin@dogcatify.com') {
          router.replace('/(admin-tabs)/requests');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      // Don't show error alert for biometric failures, just fall back to manual login
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Image 
          source={require('../../assets/images/logo.jpg')} 
          style={styles.logo} 
        />
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{t('welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('signInSubtitle')}</Text>

        {/* Biometric Login Option */}
        {isBiometricSupported && isBiometricEnabled && (
          <Card style={styles.biometricCard}>
            <View style={styles.biometricContent}>
              <Fingerprint size={32} color="#2D6A6F" />
              <View style={styles.biometricText}>
                <Text style={styles.biometricTitle}>
                  Acceso con {biometricType || 'biometría'}
                </Text>
                <Text style={styles.biometricSubtitle}>
                  Toca para iniciar sesión rápidamente
                </Text>
              </View>
            </View>
            <Button
              title={biometricLoading ? "Autenticando..." : `Usar ${biometricType || 'Biometría'}`}
              onPress={handleBiometricLogin}
              loading={biometricLoading}
              size="medium"
            />
          </Card>
        )}

        <Input
          label={t('email')}
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color="#6B7280" />}
        />

        <Input
          label={t('password')}
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          leftIcon={<Lock size={20} color="#6B7280" />}
          showPasswordToggle={true}
          isPasswordVisible={showPassword}
          onTogglePasswordVisibility={() => setShowPassword(!showPassword)}
        />

        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => router.push('/auth/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        <Button
          title={loading ? "Iniciando sesión..." : t('signIn')}
          onPress={handleLogin}
          loading={loading}
          size="large"
        />

        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => router.replace('/auth/register')}
        >
          <Text style={styles.registerText}>
            {t('dontHaveAccount')} <Text style={styles.registerLink}>{t('signUp')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  biometricCard: {
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  biometricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricText: {
    marginLeft: 12,
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  registerButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  registerLink: {
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
});