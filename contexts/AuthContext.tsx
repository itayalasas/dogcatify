import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, CircleX as XCircle } from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabaseClient } from '../lib/supabase';

export default function ConfirmEmail() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    handleEmailConfirmation();
  }, [token_hash, type]);

  const handleEmailConfirmation = async () => {
    try {
      if (!token_hash || !type) {
        setError('Enlace de confirmación inválido');
        setShowResendForm(true);
        setLoading(false);
        return;
      }

      console.log('Confirming email with token:', token_hash);

      const { data, error } = await supabaseClient.auth.verifyOtp({
        token_hash,
        type: type as any,
      });

      if (error) {
        console.error('Email confirmation error:', error);
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          setError('El enlace de confirmación ha expirado o es inválido.');
          setShowResendForm(true);
        } else {
          setError('No se pudo confirmar el email. Por favor intenta nuevamente.');
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log('Email confirmed successfully for user:', data.user.email);
        
        // Create user profile if it doesn't exist
        try {
          const { data: existingProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            console.log('Creating profile for confirmed user');
            const { error: createError } = await supabaseClient
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                display_name: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || '',
                photo_url: data.user.user_metadata?.photo_url || null,
                is_owner: true,
                is_partner: false,
                created_at: new Date().toISOString(),
                followers: [],
                following: []
              });

            if (createError) {
              console.error('Error creating profile:', createError);
              setError('Email confirmado pero hubo un error creando el perfil. Contacta con soporte.');
              setLoading(false);
              return;
            }
          }
        } catch (profileError) {
          console.error('Error checking/creating profile:', profileError);
        }

        setConfirmed(true);
      } else {
        setError('No se pudo confirmar el email');
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      setError('Error al procesar la confirmación');
      setShowResendForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    setResending(true);
    setError(null);

    try {
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: 'http://localhost:8081/auth/confirm'
        }
      });

      if (error) {
        console.error('Resend confirmation error:', error);
        setError('No se pudo reenviar el email. Verifica que el email sea correcto.');
      } else {
        setResendSuccess(true);
        setShowResendForm(false);
      }
    } catch (error) {
      console.error('Resend error:', error);
      setError('Error al reenviar el email de confirmación');
    } finally {
      setResending(false);
    }
  };
  const handleContinueToLogin = () => {
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A6F" />
          <Text style={styles.loadingText}>Confirmando tu email...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (resendSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.resultCard}>
            <View style={styles.iconContainer}>
              <CheckCircle size={80} color="#10B981" />
            </View>
            
            <Text style={styles.title}>¡Email Reenviado!</Text>
            
            <Text style={styles.subtitle}>
              Hemos enviado un nuevo enlace de confirmación a tu email. 
              Por favor revisa tu bandeja de entrada y spam.
            </Text>

            <Button
              title="Volver al Login"
              onPress={handleContinueToLogin}
              size="large"
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.resultCard}>
          <View style={styles.iconContainer}>
            {confirmed ? (
              <CheckCircle size={80} color="#10B981" />
            ) : (
              <XCircle size={80} color="#EF4444" />
            )}
          </View>
          
          <Text style={styles.title}>
            {confirmed ? '¡Email Confirmado!' : 'Error de Confirmación'}
          </Text>
          
          <Text style={styles.subtitle}>
            {confirmed 
              ? 'Tu email ha sido confirmado exitosamente. Ya puedes iniciar sesión en DogCatiFy.'
              : error || 'No se pudo confirmar tu email. Por favor intenta nuevamente.'
            }
          </Text>

          {confirmed && (
            <View style={styles.successInfo}>
              <Text style={styles.successInfoTitle}>¿Qué sigue?</Text>
              <Text style={styles.successInfoText}>
                • Ya puedes iniciar sesión con tu email y contraseña{'\n'}
                • Crea el perfil de tus mascotas{'\n'}
                • Explora servicios para tus compañeros peludos{'\n'}
                • Conecta con otros amantes de las mascotas
              </Text>
            </View>
          )}

          {showResendForm && !confirmed && (
            <View style={styles.resendForm}>
              <Text style={styles.resendTitle}>Reenviar enlace de confirmación</Text>
              <Text style={styles.resendSubtitle}>
                Ingresa tu email para recibir un nuevo enlace de confirmación
              </Text>
              
              <Input
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.emailInput}
              />
              
              <Button
                title={resending ? "Reenviando..." : "Reenviar enlace de confirmación"}
                onPress={handleResendConfirmation}
                disabled={resending}
                size="large"
                style={styles.resendButton}
              />
            </View>
          )}
          <Button
            title={confirmed ? "Ir a Iniciar Sesión" : "Volver al Login"}
            onPress={handleContinueToLogin}
            size="large"
            style={showResendForm && !confirmed ? styles.secondaryButton : undefined}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  resultCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successInfo: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successInfoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#166534',
    marginBottom: 8,
  },
  successInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    lineHeight: 20,
  },
  resendForm: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  resendTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  resendSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    marginBottom: 16,
    lineHeight: 20,
  },
  emailInput: {
    marginBottom: 16,
  },
  resendButton: {
    backgroundColor: '#F59E0B',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
});