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
  content: {
    flex: 1,
    padding: 16,
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