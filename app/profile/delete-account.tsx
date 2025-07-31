import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Trash2, TriangleAlert as AlertTriangle, Shield } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';

export default function DeleteAccount() {
  const { currentUser, logout } = useAuth();
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirmation

  const handleDeleteAccount = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }

    if (confirmationText !== 'ELIMINAR MI CUENTA') {
      Alert.alert('Error', 'Debes escribir exactamente "ELIMINAR MI CUENTA" para confirmar');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting account deletion process for user:', currentUser.id);

      // 1. Delete user's pets and related data
      console.log('Deleting pets and related data...');
      const { data: userPets, error: petsError } = await supabaseClient
        .from('pets')
        .select('id')
        .eq('owner_id', currentUser.id);

      if (petsError) {
        console.error('Error fetching user pets:', petsError);
      } else if (userPets && userPets.length > 0) {
        for (const pet of userPets) {
          // Delete pet health records
          await supabaseClient
            .from('pet_health')
            .delete()
            .eq('pet_id', pet.id);

          // Delete pet albums
          await supabaseClient
            .from('pet_albums')
            .delete()
            .eq('pet_id', pet.id);

          // Delete pet behavior records
          await supabaseClient
            .from('pet_behavior')
            .delete()
            .eq('pet_id', pet.id);

          // Delete bookings related to this pet
          await supabaseClient
            .from('bookings')
            .delete()
            .eq('pet_id', pet.id);
        }
      }

      // 2. Delete user profile
      await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', currentUser.id);

      // 3. Delete auth user
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(currentUser.id);
      
      if (deleteError) {
        throw deleteError;
      }

      Alert.alert(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
              router.replace('/auth/login');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Hubo un problema al eliminar tu cuenta. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderWarningStep = () => (
    <>
      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.warningTitle}>¡Atención!</Text>
        </View>
        <Text style={styles.warningText}>
          Estás a punto de eliminar permanentemente tu cuenta. Esta acción no se puede deshacer.
        </Text>
      </Card>

      <Card style={styles.dataCard}>
        <Text style={styles.dataTitle}>Se eliminarán los siguientes datos:</Text>
        <View style={styles.dataList}>
          <View style={styles.dataItem}>
            <Text style={styles.dataIcon}>👤</Text>
            <Text style={styles.dataText}>Tu perfil de usuario</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataIcon}>🐕</Text>
            <Text style={styles.dataText}>Todos tus perros registrados</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataIcon}>📊</Text>
            <Text style={styles.dataText}>Historial de salud y comportamiento</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataIcon}>📅</Text>
            <Text style={styles.dataText}>Todas tus reservas</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataIcon}>📸</Text>
            <Text style={styles.dataText}>Álbumes de fotos</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.alternativeCard}>
        <Text style={styles.alternativeTitle}>¿Consideraste estas alternativas?</Text>
        <View style={styles.alternativeList}>
          <Text style={styles.alternativeItem}>• Cerrar sesión temporalmente</Text>
          <Text style={styles.alternativeItem}>• Desactivar notificaciones</Text>
          <Text style={styles.alternativeItem}>• Contactar soporte para resolver problemas</Text>
        </View>
      </Card>

      <View style={styles.actionButtons}>
        <Button
          title="Continuar con la eliminación"
          onPress={() => setStep(2)}
          style={styles.dangerButton}
        />
        <Button
          title="Cancelar"
          onPress={() => router.back()}
          variant="outline"
        />
      </View>
    </>
  );

  const renderConfirmationStep = () => (
    <>
      <Card style={styles.confirmationCard}>
        <View style={styles.confirmationHeader}>
          <Shield size={48} color="#EF4444" />
          <Text style={styles.confirmationTitle}>Confirmación Final</Text>
        </View>
        
        <Text style={styles.confirmationText}>
          Para confirmar que deseas eliminar tu cuenta permanentemente, escribe exactamente la siguiente frase:
        </Text>

        <View style={styles.confirmationPhrase}>
          <Text style={styles.phraseText}>ELIMINAR MI CUENTA</Text>
        </View>

        <TextInput
          style={styles.confirmationInput}
          value={confirmationText}
          onChangeText={setConfirmationText}
          placeholder="Escribe la frase aquí"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />

        <Text style={styles.confirmationNote}>
          Esta acción es irreversible. Una vez eliminada, no podrás recuperar tu cuenta ni tus datos.
        </Text>
      </Card>

      <View style={styles.finalActions}>
        <Button
          title={loading ? "Eliminando cuenta..." : "Eliminar mi cuenta permanentemente"}
          onPress={handleDeleteAccount}
          style={styles.deleteButton}
          disabled={loading || confirmationText !== 'ELIMINAR MI CUENTA'}
        />
        <Button
          title="Volver atrás"
          onPress={() => setStep(1)}
          variant="outline"
          disabled={loading}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eliminar Cuenta</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 ? renderWarningStep() : renderConfirmationStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16;
  },
  warningCard: {
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginTop: 8,
  },
  warningText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 24,
  },
  dataCard: {
    marginBottom: 16,
  },
  dataTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  dataList: {
    gap: 12,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  dataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
  },
  alternativeCard: {
    marginBottom: 24,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  alternativeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 12,
  },
  alternativeList: {
    gap: 8,
  },
  alternativeItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0369A1',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  confirmationCard: {
    marginBottom: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  confirmationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#EF4444',
    marginTop: 8,
  },
  confirmationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  confirmationPhrase: {
    backgroundColor: '#991B1B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  phraseText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  confirmationInput: {
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  confirmationNote: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 20,
  },
  finalActions: {
    gap: 12,
    marginBottom: 24,
  },
  deleteButton: {
    backgroundColor: '#991B1B',
  },
});