import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ExternalLink } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function MercadoPagoConfig() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [mpConfig, setMpConfig] = useState<any>(null);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [manualAccessToken, setManualAccessToken] = useState('');
  const [manualPublicKey, setManualPublicKey] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadPartnerData();
    }
  }, [currentUser]);

  const loadPartnerData = async () => {
    try {
      console.log('Loading partner data for user:', currentUser?.id);
      
      const { data: partnerData, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('user_id', currentUser!.id)
        .eq('is_verified', true)
        .single();

      if (error) {
        console.error('Error loading partner data:', error);
        if (error.code === 'PGRST116') {
          // No partner found
          Alert.alert(
            'Sin negocio verificado',
            'Necesitas tener un negocio verificado para configurar Mercado Pago.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
        return;
      }

      console.log('Partner data loaded:', partnerData);
      setPartner(partnerData);
      
      // Extract Mercado Pago configuration
      if (partnerData.mercadopago_config) {
        console.log('MP config found:', partnerData.mercadopago_config);
        setMpConfig(partnerData.mercadopago_config);
        setIsTestMode(partnerData.mercadopago_config.is_test_mode || false);
      } else {
        console.log('No MP config found');
        setMpConfig(null);
      }
    } catch (error) {
      console.error('Error in loadPartnerData:', error);
      Alert.alert('Error', 'No se pudo cargar la información del negocio');
    } finally {
      setLoading(false);
    }
  };

  const validateCredentials = async (accessToken: string, publicKey: string) => {
    try {
      // Basic validation of token format
      const isValidToken = accessToken.startsWith('APP_USR-') || accessToken.startsWith('TEST-');
      const isValidKey = publicKey.startsWith('APP_USR-') || publicKey.startsWith('TEST-');
      
      if (!isValidToken || !isValidKey) {
        throw new Error('Formato de credenciales inválido');
      }

      // Try to validate with Mercado Pago API
      try {
        const response = await fetch('https://api.mercadopago.com/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          return {
            isValid: true,
            accountId: userData.id,
            email: userData.email
          };
        } else {
          return { isValid: isValidToken && isValidKey };
        }
      } catch (apiError) {
        console.log('API validation failed, using format validation:', apiError);
        return { isValid: isValidToken && isValidKey };
      }
    } catch (error) {
      return { isValid: false };
    }
  };

  const handleSaveManualConfig = async () => {
    if (!manualAccessToken.trim() || !manualPublicKey.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setSaveLoading(true);
    try {
      const validation = await validateCredentials(
        manualAccessToken.trim(), 
        manualPublicKey.trim()
      );
      
      if (!validation.isValid) {
        Alert.alert(
          'Credenciales inválidas',
          'Las credenciales ingresadas no son válidas. Verifica que sean correctas.'
        );
        setSaveLoading(false);
        return;
      }

      const config = {
        access_token: manualAccessToken.trim(),
        public_key: manualPublicKey.trim(),
        is_test_mode: isTestMode,
        account_id: validation.accountId || '',
        email: validation.email || '',
        connected_at: new Date().toISOString(),
        is_oauth: false // Manual configuration
      };

      const { error } = await supabaseClient
        .from('partners')
        .update({
          mercadopago_connected: true,
          mercadopago_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', partner.id);

      if (error) throw error;

      setMpConfig(config);
      setPartner(prev => ({
        ...prev,
        mercadopago_connected: true,
        mercadopago_config: config
      }));

      Alert.alert(
        '¡Éxito!',
        'Tu cuenta de Mercado Pago ha sido configurada correctamente. Ya puedes recibir pagos.',
        [{ text: 'Continuar', onPress: () => setShowManualConfig(false) }]
      );
    } catch (error) {
      console.error('Error saving MP config:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración. Intenta nuevamente.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Mercado Pago',
      '¿Estás seguro? Esto deshabilitará la recepción de pagos para tu negocio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabaseClient
                .from('partners')
                .update({
                  mercadopago_connected: false,
                  mercadopago_config: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', partner.id);

              if (error) throw error;

              setMpConfig(null);
              setPartner(prev => ({
                ...prev,
                mercadopago_connected: false,
                mercadopago_config: null
              }));

              Alert.alert('Desconectado', 'Tu cuenta de Mercado Pago ha sido desconectada.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo desconectar la cuenta.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Configuración de Mercado Pago</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Configuración de Mercado Pago</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Sin negocio verificado</Text>
          <Text style={styles.errorText}>
            Necesitas tener un negocio verificado para configurar Mercado Pago.
          </Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración de Mercado Pago</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Business Info */}
        <Card style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <CreditCard size={24} color="#00A650" />
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{partner.business_name}</Text>
              <Text style={styles.businessType}>
                {partner.business_type === 'shop' ? 'Tienda' : 
                 partner.business_type === 'veterinary' ? 'Veterinaria' : 
                 partner.business_type === 'grooming' ? 'Peluquería' : 
                 partner.business_type}
              </Text>
            </View>
          </View>
        </Card>

        {/* Connection Status */}
        {mpConfig ? (
          <Card style={styles.statusCard}>
            <View style={styles.connectedHeader}>
              <CheckCircle size={32} color="#00A650" />
              <Text style={styles.connectedTitle}>✅ Cuenta Conectada</Text>
            </View>
            
            <View style={styles.configDetails}>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Estado:</Text>
                <Text style={styles.configValue}>Conectado</Text>
              </View>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Modo:</Text>
                <Text style={styles.configValue}>
                  {mpConfig.is_test_mode ? '🧪 Prueba' : '🚀 Producción'}
                </Text>
              </View>
              
              {mpConfig.account_id && (
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>ID de cuenta:</Text>
                  <Text style={styles.configValue}>{mpConfig.account_id}</Text>
                </View>
              )}
              
              {mpConfig.email && (
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Email:</Text>
                  <Text style={styles.configValue}>{mpConfig.email}</Text>
                </View>
              )}
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Conectado:</Text>
                <Text style={styles.configValue}>
                  {new Date(mpConfig.connected_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
              <Text style={styles.infoText}>
                • Los clientes pagan a través de Mercado Pago{'\n'}
                • Recibes el 95% del monto directamente en tu cuenta{'\n'}
                • DogCatiFy retiene el 5% como comisión{'\n'}
                • Los fondos llegan automáticamente a tu cuenta MP
              </Text>
            </View>
            
            <Button
              title="Desconectar Cuenta"
              onPress={handleDisconnect}
              variant="outline"
              size="large"
            />
          </Card>
        ) : (
          <Card style={styles.statusCard}>
            <View style={styles.disconnectedHeader}>
              <AlertCircle size={32} color="#F59E0B" />
              <Text style={styles.disconnectedTitle}>⚠️ Sin Configurar</Text>
            </View>
            
            <Text style={styles.disconnectedText}>
              Para recibir pagos, necesitas conectar tu cuenta de Mercado Pago.
            </Text>
            
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>• Recibe pagos directamente en tu cuenta</Text>
              <Text style={styles.benefitItem}>• Comisión automática del 5%</Text>
              <Text style={styles.benefitItem}>• Proceso seguro y confiable</Text>
              <Text style={styles.benefitItem}>• Compatible con tarjetas, transferencias y más</Text>
            </View>
            
            <Button
              title="Configurar Manualmente"
              onPress={() => setShowManualConfig(true)}
              size="large"
            />
          </Card>
        )}

        {/* Manual Configuration Modal */}
        {showManualConfig && (
          <Card style={styles.manualConfigCard}>
            <Text style={styles.manualConfigTitle}>Configuración Manual</Text>
            
            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>💡 ¿Cómo obtener las credenciales?</Text>
              <Text style={styles.helpStep}>1. Ve a developers.mercadopago.com</Text>
              <Text style={styles.helpStep}>2. Inicia sesión con tu cuenta de MP</Text>
              <Text style={styles.helpStep}>3. Ve a "Tus integraciones" → "Credenciales"</Text>
              <Text style={styles.helpStep}>4. Copia el Access Token y Public Key</Text>
            </View>

            <Input
              label="Access Token *"
              placeholder="APP_USR-xxxxxxxx o TEST-xxxxxxxx"
              value={manualAccessToken}
              onChangeText={setManualAccessToken}
            />

            <Input
              label="Public Key *"
              placeholder="APP_USR-xxxxxxxx o TEST-xxxxxxxx"
              value={manualPublicKey}
              onChangeText={setManualPublicKey}
            />

            <View style={styles.testModeSection}>
              <View style={styles.testModeHeader}>
                <Text style={styles.testModeTitle}>Modo de prueba</Text>
                <Switch
                  value={isTestMode}
                  onValueChange={setIsTestMode}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                  thumbColor={isTestMode ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              <Text style={styles.testModeDescription}>
                {isTestMode 
                  ? '🧪 Modo prueba activo - Usa credenciales TEST-' 
                  : '🚀 Modo producción - Usa credenciales APP_USR- reales'
                }
              </Text>
            </View>

            <View style={styles.manualConfigActions}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setShowManualConfig(false);
                  setManualAccessToken('');
                  setManualPublicKey('');
                }}
                variant="outline"
                size="medium"
              />
              <Button
                title="Guardar"
                onPress={handleSaveManualConfig}
                loading={saveLoading}
                size="medium"
              />
            </View>
          </Card>
        )}

        {/* Help Section */}
        <Card style={styles.helpCard}>
          <Text style={styles.helpCardTitle}>¿Necesitas ayuda?</Text>
          <Text style={styles.helpCardText}>
            Si tienes problemas configurando Mercado Pago, puedes contactar con nuestro soporte.
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <ExternalLink size={16} color="#3B82F6" />
            <Text style={styles.helpButtonText}>Contactar Soporte</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  businessCard: {
    marginBottom: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessInfo: {
    marginLeft: 12,
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  businessType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statusCard: {
    marginBottom: 16,
  },
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#00A650',
    marginTop: 8,
  },
  disconnectedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  disconnectedTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    marginTop: 8,
  },
  disconnectedText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  configDetails: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  configLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  configValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#00A650',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#166534',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    lineHeight: 20,
  },
  manualConfigCard: {
    marginBottom: 16,
  },
  manualConfigTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpSection: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0369A1',
    marginBottom: 12,
  },
  helpStep: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    marginBottom: 4,
    paddingLeft: 8,
  },
  testModeSection: {
    marginBottom: 20,
  },
  testModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  testModeTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  testModeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
  },
  manualConfigActions: {
    flexDirection: 'row',
    gap: 12,
  },
  helpCard: {
    marginBottom: 16,
  },
  helpCardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  helpCardText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    marginLeft: 6,
  },
});