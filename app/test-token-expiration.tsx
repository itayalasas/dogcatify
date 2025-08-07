import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabaseClient } from '../lib/supabase';

export default function TestTokenExpiration() {
  const { currentUser, checkTokenValidity } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testTokenValidation = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      addTestResult('🔍 Iniciando prueba de validación de token...');
      
      // Test 1: Check current token validity
      addTestResult('📋 Test 1: Verificando token actual...');
      const isValid = await checkTokenValidity();
      addTestResult(`✅ Token actual válido: ${isValid ? 'SÍ' : 'NO'}`);
      
      // Test 2: Get current session info
      addTestResult('📋 Test 2: Obteniendo información de sesión...');
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (session) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;
        const timeUntilExpiry = expiresAt - now;
        
        addTestResult(`📅 Token expira en: ${Math.floor(timeUntilExpiry / 60)} minutos`);
        addTestResult(`🕐 Timestamp actual: ${now}`);
        addTestResult(`🕐 Token expira en: ${expiresAt}`);
      } else {
        addTestResult('❌ No hay sesión activa');
      }
      
      // Test 3: Try to make an API call
      addTestResult('📋 Test 3: Probando llamada a la API...');
      try {
        const { data, error: apiError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', currentUser?.id || '')
          .limit(1);
        
        if (apiError) {
          addTestResult(`❌ Error en API: ${apiError.message}`);
          if (apiError.message?.includes('JWT') || apiError.message?.includes('expired')) {
            addTestResult('🚨 Error JWT detectado - Token expirado');
          }
        } else {
          addTestResult('✅ Llamada a API exitosa');
        }
      } catch (apiError: any) {
        addTestResult(`❌ Excepción en API: ${apiError.message}`);
      }
      
      addTestResult('✅ Prueba de validación completada');
      
    } catch (error: any) {
      addTestResult(`❌ Error en prueba: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const simulateTokenExpiration = async () => {
    Alert.alert(
      'Simular Expiración de Token',
      'Esto forzará la expiración del token para probar el sistema de redirección. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Simular',
          style: 'destructive',
          onPress: async () => {
            setTesting(true);
            setTestResults([]);
            
            try {
              addTestResult('🧪 Iniciando simulación de token expirado...');
              
              // Force sign out to simulate expired token
              addTestResult('🔄 Forzando cierre de sesión...');
              await supabaseClient.auth.signOut();
              
              addTestResult('✅ Sesión cerrada - debería redirigir al login');
              
              // The AuthContext should detect this and redirect automatically
              setTimeout(() => {
                addTestResult('⏰ Esperando redirección automática...');
              }, 1000);
              
            } catch (error: any) {
              addTestResult(`❌ Error en simulación: ${error.message}`);
            } finally {
              setTesting(false);
            }
          }
        }
      ]
    );
  };

  const testAPICallWithExpiredToken = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      addTestResult('🧪 Probando llamada API con token potencialmente expirado...');
      
      // Try to create a pet (this should trigger token validation)
      addTestResult('📋 Intentando crear mascota de prueba...');
      
      const testPetData = {
        name: 'Test Pet',
        species: 'dog',
        breed: 'Test Breed',
        age: 1,
        age_display: { value: 1, unit: 'years' },
        weight: 5,
        weight_display: { value: 5, unit: 'kg' },
        gender: 'male',
        is_neutered: false,
        has_chip: false,
        owner_id: currentUser?.id || '',
        personality: [],
      };
      
      const { data, error } = await supabaseClient
        .from('pets')
        .insert(testPetData)
        .select('id')
        .single();
      
      if (error) {
        addTestResult(`❌ Error en creación: ${error.message}`);
        
        if (error.message?.includes('JWT') || 
            error.message?.includes('expired') ||
            error.message?.includes('invalid')) {
          addTestResult('🚨 Error JWT detectado - Sistema debería redirigir');
        }
      } else {
        addTestResult('✅ Mascota de prueba creada exitosamente');
        
        // Clean up test pet
        if (data?.id) {
          await supabaseClient
            .from('pets')
            .delete()
            .eq('id', data.id);
          addTestResult('🧹 Mascota de prueba eliminada');
        }
      }
      
    } catch (error: any) {
      addTestResult(`❌ Excepción: ${error.message}`);
      
      if (error.message?.includes('JWT') || error.message?.includes('expired')) {
        addTestResult('🚨 Error JWT en excepción - Sistema debería redirigir');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Test - Expiración de Token</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Card style={styles.infoCard}>
          <Shield size={48} color="#3B82F6" />
          <Text style={styles.infoTitle}>Prueba de Expiración de Token</Text>
          <Text style={styles.infoDescription}>
            Esta pantalla te permite probar el sistema de manejo de tokens expirados.
          </Text>
          
          {currentUser && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>
                Usuario: {currentUser.displayName} ({currentUser.email})
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.testsCard}>
          <Text style={styles.testsTitle}>🧪 Pruebas Disponibles</Text>
          
          <View style={styles.testButtons}>
            <Button
              title="1. Verificar Token Actual"
              onPress={testTokenValidation}
              loading={testing}
              size="large"
              variant="outline"
            />
            
            <Button
              title="2. Probar API con Token"
              onPress={testAPICallWithExpiredToken}
              loading={testing}
              size="large"
              variant="outline"
            />
            
            <Button
              title="3. Simular Token Expirado"
              onPress={simulateTokenExpiration}
              loading={testing}
              size="large"
            />
          </View>
        </Card>

        {testResults.length > 0 && (
          <Card style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>📊 Resultados de Prueba</Text>
            <View style={styles.resultsList}>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultItem}>
                  {result}
                </Text>
              ))}
            </View>
          </Card>
        )}

        <Card style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Instrucciones</Text>
          <View style={styles.instructionsList}>
            <Text style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text> Verificar Token Actual - Revisa el estado actual de tu token
            </Text>
            <Text style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text> Probar API - Intenta hacer una llamada a la API para detectar errores
            </Text>
            <Text style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text> Simular Expiración - Fuerza el cierre de sesión para probar la redirección
            </Text>
          </View>
          
          <View style={styles.expectedBehavior}>
            <Text style={styles.expectedTitle}>✅ Comportamiento Esperado:</Text>
            <Text style={styles.expectedText}>
              • Detección automática de token expirado{'\n'}
              • Alert informativo al usuario{'\n'}
              • Redirección automática al login{'\n'}
              • Limpieza del estado de la aplicación
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  userInfo: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
  },
  userInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#0369A1',
    textAlign: 'center',
  },
  testsCard: {
    marginBottom: 16,
  },
  testsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  testButtons: {
    gap: 12,
  },
  resultsCard: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  resultsList: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  resultItem: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 4,
    lineHeight: 16,
  },
  instructionsCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#166534',
    marginBottom: 12,
  },
  instructionsList: {
    marginBottom: 16,
  },
  instructionItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionNumber: {
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  expectedBehavior: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  expectedTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#166534',
    marginBottom: 8,
  },
  expectedText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    lineHeight: 18,
  },
});