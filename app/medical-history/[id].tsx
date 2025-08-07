import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabaseClient } from '../../lib/supabase';

export default function MedicalHistoryWeb() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMedicalHistory();
    }
  }, [id, token]);

  const fetchMedicalHistory = async () => {
    try {
      console.log('Fetching medical history for pet:', id);
      console.log('Using token:', token ? 'Yes' : 'No');
      
      // Call the Edge Function directly
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/medical-history/${id}${token ? `?token=${token}` : ''}`;
      
      console.log('Calling function URL:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Function response error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const htmlData = await response.text();
      console.log('HTML content received, length:', htmlData.length);
      
      setHtmlContent(htmlData);
    } catch (error) {
      console.error('Error fetching medical history:', error);
      setError(error.message || 'Error al cargar la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'web') {
    // For mobile, redirect to the mobile medical history screen
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.mobileContainer}>
          <Text style={styles.mobileTitle}>Historia Clínica</Text>
          <Text style={styles.mobileText}>
            Esta página está optimizada para veterinarios en navegadores web.
          </Text>
          <Text style={styles.mobileText}>
            Para ver la historia clínica en la app móvil, ve al perfil de tu mascota.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A6F" />
          <Text style={styles.loadingText}>Cargando historia clínica...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error al cargar historia clínica</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHelp}>
            Si el problema persiste, contacta con el propietario de la mascota.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // For web, render the HTML content
  if (Platform.OS === 'web' && htmlContent) {
    return (
      <div 
        style={{ width: '100%', height: '100vh' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Contenido no disponible</Text>
        <Text style={styles.errorText}>
          No se pudo cargar la historia clínica.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorHelp: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  mobileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mobileTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    marginBottom: 16,
    textAlign: 'center',
  },
  mobileText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
});