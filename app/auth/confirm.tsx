import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabaseClient } from '../../lib/supabase';

export default function ConfirmScreen() {
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleEmailConfirmation();
  }, []);

  const handleEmailConfirmation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract parameters from URL
      const token_hash = params.token_hash as string;
      const type = params.type as string;
      const token = params.token as string; // Legacy support

      console.log('Confirmation parameters:', { token_hash, type, token });

      if (!token_hash && !token) {
        setError('Enlace de confirmación inválido o incompleto');
        setLoading(false);
        setShowResendForm(true);
        return;
      }

      let result;
      
      if (token_hash && type) {
        // New method with token_hash and type
        result = await supabaseClient.auth.verifyOtp({
          token_hash,
          type: type as any
        });
      } else if (token) {
        // Legacy method with token
        result = await supabaseClient.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
      }

      if (result?.error) {
        console.error('Confirmation error:', result.error);
        setError('Error al procesar la confirmación');
        setShowResendForm(true);
        setLoading(false);
        return;
      }

      if (result?.data?.user) {
        await handleSuccessfulConfirmation(result.data.user);
      }

    } catch (error) {
      console.error('Confirmation error:', error);
      setError('Error al procesar la confirmación');
      setLoading(false);
      setShowResendForm(true);
    }
  };

  const handleSuccessfulConfirmation = async (user: any) => {
    console.log('Email confirmed successfully for user:', user.email);
    
    // Create user profile if it doesn't exist
    try {
      const { data: existingProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating profile for confirmed user');
        const { error: createError } = await supabaseClient
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
            photo_url: user.user_metadata?.photo_url || null,
            created_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            email_confirmed: true,
            is_partner: false,
            is_owner: true,
            followers: [],
            following: []
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          setError('Email confirmado pero hubo un error creando el perfil. Contacta con soporte.');
          setLoading(false);
          return;
        }
      } else if (existingProfile) {
        // Profile exists, update confirmation status
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            email_confirmed: true,
            email_confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile confirmation:', updateError);
        }
      }
    } catch (profileError) {
      console.error('Error checking/creating profile:', profileError);
    }
    
    setConfirmed(true);
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    try {
      setResending(true);
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081'}/auth/confirm`
        }
      });

      if (error) {
        Alert.alert('Error', 'No se pudo reenviar el email de confirmación');
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

  const handleGoToLogin = () => {
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Confirmando tu email...</Text>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.container}>
        <Text style={styles.successTitle}>¡Email Confirmado!</Text>
        <Text style={styles.successText}>
          Tu cuenta ha sido activada exitosamente. Ya puedes iniciar sesión.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
          <Text style={styles.buttonText}>Ir a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error && showResendForm) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Error de Confirmación</Text>
        <Text style={styles.errorText}>{error}</Text>
        
        <View style={styles.resendContainer}>
          <Text style={styles.resendTitle}>Reenviar Email de Confirmación</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={[styles.button, resending && styles.buttonDisabled]} 
            onPress={handleResendConfirmation}
            disabled={resending}
          >
            <Text style={styles.buttonText}>
              {resending ? 'Enviando...' : 'Reenviar Confirmación'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.linkButton} onPress={handleGoToLogin}>
          <Text style={styles.linkText}>Volver al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>Error</Text>
      <Text style={styles.errorText}>
        {error || 'Ocurrió un error inesperado'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
        <Text style={styles.buttonText}>Volver al Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 20,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  resendContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 20,
  },
  resendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: '#0066cc',
    fontSize: 16,
    textAlign: 'center',
  },
});