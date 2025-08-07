import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AuthContext } from '@/contexts/AuthContext';
import { BiometricContext } from '@/contexts/BiometricContext';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react-native';
import { resendConfirmationEmail } from '@/utils/emailConfirmation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const { login, user } = useContext(AuthContext);
  const { isBiometricSupported, isBiometricEnabled, enableBiometric } = useContext(BiometricContext);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setAuthError(null);
    setShowEmailConfirmation(false);

    try {
      console.log('Attempting login with credentials:', email);
      const result = await login(email, password);
      
      if (result.success) {
        console.log('Login - Email confirmation validated successfully');
        
        // Show biometric setup only if login was successful and no auth errors
        if (result && isBiometricSupported && !isBiometricEnabled && email && password) {
          Alert.alert(
            'Habilitar acceso rápido',
            '¿Quieres usar tu Face ID para iniciar sesión más rápido la próxima vez?',
            [
              { text: 'Ahora no', style: 'cancel' },
              {
                text: 'Habilitar',
                onPress: async () => {
                  try {
                    await enableBiometric(email, password);
                  } catch (error) {
                    console.error('Error enabling biometric:', error);
                  }
                }
              }
            ]
          );
        }
      } else {
        // Handle different error types
        if (result.error === 'email_not_confirmed') {
          setShowEmailConfirmation(true);
          setAuthError('Tu correo electrónico no ha sido confirmado. Por favor revisa tu bandeja de entrada.');
        } else {
          setAuthError(result.error || 'Error al iniciar sesión');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setResendingEmail(true);
    try {
      const result = await resendConfirmationEmail(email);
      if (result.success) {
        Alert.alert(
          'Correo enviado',
          'Se ha enviado un nuevo correo de confirmación. Revisa tu bandeja de entrada.',
          [{ text: 'Entendido', style: 'default' }]
        );
        setShowEmailConfirmation(false);
        setAuthError(null);
      } else {
        Alert.alert('Error', result.error || 'No se pudo reenviar el correo');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      Alert.alert('Error', 'No se pudo reenviar el correo de confirmación');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>¡Bienvenido de vuelta!</Text>
          <Text style={styles.subtitle}>
            Inicia sesión para conectar con tu comunidad de mascotas
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {showEmailConfirmation && (
            <View style={styles.confirmationContainer}>
              <Text style={styles.confirmationTitle}>Correo electrónico no confirmado</Text>
              <Text style={styles.confirmationText}>
                Debes confirmar tu correo electrónico antes de acceder a la aplicación.
              </Text>
              <Text style={styles.confirmationEmail}>Email: {email}</Text>
              <Text style={styles.confirmationInstructions}>
                Revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de confirmación.
              </Text>
              
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendEmail}
                disabled={resendingEmail}
              >
                {resendingEmail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.resendButtonText}>REENVIAR CORREO</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
    paddingVertical: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  errorContainer: {
    backgroundColor: '#fed7d7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c53030',
    fontSize: 14,
    textAlign: 'center',
  },
  confirmationContainer: {
    backgroundColor: '#e6fffa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38b2ac',
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c7a7b',
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: '#2c7a7b',
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmationEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c7a7b',
    marginBottom: 8,
  },
  confirmationInstructions: {
    fontSize: 13,
    color: '#2c7a7b',
    marginBottom: 16,
    lineHeight: 18,
  },
  resendButton: {
    backgroundColor: '#38b2ac',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#4299e1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4299e1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#a0aec0',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#4299e1',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#718096',
    fontSize: 14,
  },
  registerLink: {
    color: '#4299e1',
    fontSize: 14,
    fontWeight: '600',
  },
});