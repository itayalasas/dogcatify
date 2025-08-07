import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Modal } from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBiometric } from '../../contexts/BiometricContext';
import { resendConfirmationEmail } from '../../utils/emailConfirmation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const { login, authError, clearAuthError } = useAuth();
  const { t } = useLanguage();
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    biometricType, 
    enableBiometric,
    authenticateWithBiometric
  } = useBiometric();

  // Check for biometric authentication on component mount
  useEffect(() => {
    const checkBiometricLogin = async () => {
      if (isBiometricEnabled && isBiometricSupported) {
        try {
          const credentials = await authenticateWithBiometric();
          if (credentials) {
            setEmail(credentials.email);
            setPassword(credentials.password);
            // Auto-login with biometric credentials
            handleLogin(credentials.email, credentials.password);
          }
        } catch (error) {
          console.log('Biometric authentication cancelled or failed');
        }
      }
    };

    // Small delay to ensure component is mounted
    setTimeout(checkBiometricLogin, 500);
  }, [isBiometricEnabled, isBiometricSupported]);

  // Handle auth errors from context
  useEffect(() => {
    if (authError) {
      if (authError.startsWith('EMAIL_NOT_CONFIRMED:')) {
        const userEmail = authError.split(':')[1];
        setPendingEmail(userEmail || email);
        setShowEmailConfirmationModal(true);
      }
    }
  }, [authError]);

  const handleLogin = async (emailParam?: string, passwordParam?: string) => {
    const loginEmail = emailParam || email;
    const loginPassword = passwordParam || password;

    if (!loginEmail || !loginPassword) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }

    setLoading(true);
    clearAuthError();
    setShowEmailConfirmation(false);

    try {
      console.log('Attempting login with credentials:', loginEmail);
      const result = await login(loginEmail, loginPassword);
      
      if (result) {
        console.log('Login successful');
        
        // Save credentials if user opted to save them
        if (saveCredentials && isBiometricSupported) {
          try {
            await enableBiometric(loginEmail, loginPassword);
            console.log('Credentials saved with biometric authentication');
          } catch (error) {
            console.error('Error saving credentials:', error);
          }
        }
        
        // Show biometric setup only if login was successful
        if (isBiometricSupported && !isBiometricEnabled && !saveCredentials && loginEmail && loginPassword) {
          Alert.alert(
            'Habilitar acceso rápido',
            `¿Quieres usar tu ${biometricType || 'biometría'} para iniciar sesión más rápido la próxima vez?`,
            [
              { text: 'Ahora no', style: 'cancel' },
              {
                text: 'Habilitar',
                onPress: async () => {
                  try {
                    await enableBiometric(loginEmail, loginPassword);
                    Alert.alert(
                      'Biometría habilitada',
                      `${biometricType || 'La autenticación biométrica'} ha sido configurada correctamente.`
                    );
                  } catch (error) {
                    console.error('Error enabling biometric:', error);
                  }
                }
              }
            ]
          );
        }
        
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(t('error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingEmail) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setResendingEmail(true);
    try {
      const result = await resendConfirmationEmail(pendingEmail);
      if (result.success) {
        Alert.alert(
          'Correo enviado',
          'Se ha enviado un nuevo correo de confirmación. Revisa tu bandeja de entrada.',
          [{ text: 'Entendido', onPress: () => {
            setShowEmailConfirmationModal(false);
            clearAuthError();
          }}]
        );
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

  const handleCloseEmailModal = () => {
    setShowEmailConfirmationModal(false);
    clearAuthError();
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/logo.jpg')} 
            style={styles.logo} 
          />
          <Text style={styles.title}>{t('welcomeBack')}</Text>
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

          <View style={styles.passwordContainer}>
            <Input
              label={t('password')}
              placeholder={t('password')}
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
          </View>

          {isBiometricSupported && (
            <View style={styles.saveCredentialsContainer}>
              <TouchableOpacity 
                style={styles.saveCredentialsRow} 
                onPress={() => setSaveCredentials(!saveCredentials)}
              >
                <View style={[styles.checkbox, saveCredentials && styles.checkedCheckbox]}>
                  {saveCredentials && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.saveCredentialsText}>
                  Guardar credenciales con {biometricType || 'biometría'}
                </Text>
              </TouchableOpacity>
            </View>
          />

          <Button
            title={t('signIn')}
            onPress={() => handleLogin()}
            loading={loading}
            disabled={loading}
            size="large"
          />

          <View style={styles.forgotPasswordContainer}>
            <Link href="/auth/forgot-password" style={styles.forgotPasswordLink}>
              {t('forgotPassword')}
            </Link>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('dontHaveAccount')}{' '}
            <Link href="/auth/register" style={styles.link}>
              {t('signUp')}
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
};

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
  passwordContainer: {
    position: 'relative',
  },
  saveCredentialsContainer: {
    marginBottom: 20,
  },
  saveCredentialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  saveCredentialsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
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
    marginTop: 32,
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
            />
          </View>
        )}

        <Button
          title={t('signIn')}
          onPress={() => handleLogin()}
          loading={loading}
          disabled={loading}
          size="large"
        />

        <View style={styles.forgotPasswordContainer}>
          <Link href="/auth/forgot-password" style={styles.forgotPasswordLink}>
            {t('forgotPassword')}
          </Link>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('dontHaveAccount')}{' '}
          <Link href="/auth/register" style={styles.link}>
            {t('signUp')}
          </Link>
        </Text>
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
  passwordContainer: {
    position: 'relative',
  },
  confirmationContainer: {
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  confirmationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  confirmationEmail: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
    marginBottom: 8,
  },
  confirmationInstructions: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1E40AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  resendButton: {
    backgroundColor: '#3B82F6',
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
    marginTop: 32,
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
});