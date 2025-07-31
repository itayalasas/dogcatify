import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, CircleX as XCircle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabaseClient } from '../../lib/supabase';

export default function ConfirmEmail() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleEmailConfirmation();
  }, [token_hash, type]);

  const handleEmailConfirmation = async () => {
    try {
      if (!token_hash || !type) {
        setError('Enlace de confirmación inválido');
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
        setError('No se pudo confirmar el email. El enlace puede haber expirado.');
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
    } finally {
      setLoading(false);
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

          <Button
            title={confirmed ? "Ir a Iniciar Sesión" : "Volver al Login"}
            onPress={handleContinueToLogin}
            size="large"
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
});