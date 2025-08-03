import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { confirmEmailCustom, resendConfirmationEmail } from '@/utils/emailConfirmation';

export default function ConfirmScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Password reset specific states
  const [userId, setUserId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    const confirmEmail = async () => {
      const { token_hash, type } = params;
      
      if (!token_hash) {
        setError('Token de confirmación no encontrado');
        setLoading(false);
        setShowResendForm(true);
        return;
      }

      try {
        const result = await confirmEmailCustom(token_hash as string, type as string);
        
        if (!result.success) {
          setError(result.error || 'Error al confirmar el email');
          setLoading(false);
          setShowResendForm(true);
          return;
        }

        if (result.userId && result.email) {
        console.log('Custom email confirmation successful for:', result.email);
        setUserEmail(result.email);
        
        if (type === 'password_reset') {
          // For password reset, show password form
          setUserId(result.userId);
          setResetToken(token_hash);
          setConfirmed(false); // Don't show success yet
        } else {
          // For signup confirmation, show success
          setConfirmed(true);
        }
      }

    } catch (error) {
      console.error('Custom confirmation error:', error);
      setError('Error al procesar la confirmación');
      setLoading(false);
      setShowResendForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    try {
      setResending(true);
      const result = await resendConfirmationEmail(email.trim());

      if (!result.success) {
        Alert.alert('Error', result.error || 'No se pudo reenviar el email de confirmación');
      } else {
        Alert.alert('Éxito', 'Email de confirmación reenviado. Revisa tu bandeja de entrada.');
        setShowResendForm(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al reenviar el email');
    } finally {
      setResending(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa ambos campos de contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!userId || !resetToken) {
      Alert.alert('Error', 'Información de reset inválida');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Call our Edge Function to reset password securely
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
          token: resetToken
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar contraseña');
      }

      setPasswordUpdated(true);
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );

    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleGoToLogin = () => {
    if (Platform.OS === 'web') {
      router.replace('/web-info');
    } else {
      router.replace('/auth/login');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#2D6A6F" />
          <Text style={styles.loadingText}>Confirmando tu email...</Text>
        </Card>
      </View>
    );
  }

  // Show password reset form for password_reset type
  if (!confirmed && !error && userId && resetToken && params.type === 'password_reset') {
    return (
      <View style={styles.container}>
        <Card style={styles.passwordCard}>
          <View style={styles.iconContainer}>
            <CheckCircle size={64} color="#2D6A6F" />
          </View>
          
          <Text style={styles.passwordTitle}>Restablecer Contraseña</Text>
          <Text style={styles.passwordText}>
            Ingresa tu nueva contraseña para la cuenta: {userEmail}
          </Text>

          <View style={styles.passwordForm}>
            <Input
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button
              title={updatingPassword ? "Actualizando..." : "Cambiar Contraseña"}
              onPress={handlePasswordReset}
              loading={updatingPassword}
              disabled={!newPassword || !confirmPassword || updatingPassword}
              size="large"
            />
          </View>
        </Card>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.container}>
        <Card style={styles.successCard}>
          <CheckCircle size={64} color="#10B981" />
          <Text style={styles.successTitle}>¡Email Confirmado!</Text>
          <Text style={styles.successText}>
            Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión y disfrutar de todas las funciones de DogCatiFy.
          </Text>
          {userEmail && (
            <Text style={styles.emailText}>
              Email confirmado: {userEmail}
            </Text>
          )}
          <Button
            title="Ir a Iniciar Sesión"
            onPress={handleGoToLogin}
            size="large"
          />
        </Card>
      </View>
    );
  }

  if (error && showResendForm) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <XCircle size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error de Confirmación</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <View style={styles.resendContainer}>
            <Text style={styles.resendTitle}>Reenviar Email de Confirmación</Text>
            <Text style={styles.resendDescription}>
              Ingresa tu email para recibir un nuevo enlace de confirmación
            </Text>
            
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color="#6B7280" />}
            />
            
            <Button
              title={resending ? 'Enviando...' : 'Reenviar Confirmación'}
              onPress={handleResendConfirmation}
              loading={resending}
              size="large"
            />
          </View>

          <TouchableOpacity style={styles.linkButton} onPress={handleGoToLogin}>
            <Text style={styles.linkText}>Volver al Login</Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.errorCard}>
        <XCircle size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>
          {error || 'Ocurrió un error inesperado'}
        </Text>
        <Button
          title="Volver al Login"
          onPress={handleGoToLogin}
          size="large"
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    paddingTop: 50,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  emailText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  passwordCard: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
    maxWidth: 400,
  },
  passwordTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  passwordText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  passwordForm: {
    width: '100%',
    gap: 16,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  resendContainer: {
    width: '100%',
    marginBottom: 24,
  },
  resendTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  resendDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    textAlign: 'center',
  },
});