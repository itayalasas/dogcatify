import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { router, Stack, Link } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !fullName) {
      Alert.alert('Error', t('fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', t('passwordsDontMatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', t('passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      console.log('Starting registration process...');
      await register(email.trim(), password, fullName.trim());
      
      // Show success alert and redirect to login
      Alert.alert(
        '¡Registro exitoso! 🎉',
        `Tu cuenta ha sido creada exitosamente.\n\n📧 Hemos enviado un correo de confirmación a:\n${email.trim()}\n\nPor favor revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de confirmación.\n\n⏰ El enlace expira en 24 horas.`,
        [
          {
            text: 'Entendido',
            onPress: () => {
              // Clear form
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setFullName('');
              // Navigate to login
              router.replace('/auth/login');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'No se pudo crear la cuenta';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = '📧 Este correo electrónico ya está registrado.\n\n¿Ya tienes una cuenta? Intenta iniciar sesión o recuperar tu contraseña.';
        Alert.alert(
          'Email ya registrado',
          errorMessage,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir al Login', onPress: () => router.push('/auth/login') },
            { text: 'Recuperar Contraseña', onPress: () => router.push('/auth/forgot-password') }
          ]
        );
        return;
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = '📧 El formato del correo electrónico no es válido.\n\nPor favor verifica que esté escrito correctamente.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = '🔒 La contraseña debe tener al menos 6 caracteres.\n\nPor favor elige una contraseña más segura.';
      } else if (error.message?.includes('signup is disabled')) {
        errorMessage = '🚫 El registro está temporalmente deshabilitado.\n\nPor favor intenta más tarde o contacta con soporte.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '⏰ Demasiados intentos de registro.\n\nPor favor espera unos minutos antes de intentar nuevamente.';
      } else if (error.message) {
        errorMessage = `❌ Error: ${error.message}`;
      }
      
      Alert.alert('Error en el registro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo.jpg')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>{t('joinPatitas')}</Text>
        <Text style={styles.subtitle}>{t('createAccountSubtitle')}</Text>
      </View>

      <View style={styles.form}>
        <Input
          label={t('fullName')}
          placeholder={t('fullName')}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          leftIcon={<User size={20} color="#6B7280" />}
        />

        <Input
          label={t('email')}
          placeholder={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color="#6B7280" />}
        />

        <Input
          label={t('password')}
          placeholder={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Lock size={20} color="#6B7280" />}
        />

        <Input
          label={t('confirmPassword')}
          placeholder={t('confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          leftIcon={<Lock size={20} color="#6B7280" />}
        />

        <Button
          title={t('createAccount')}
          onPress={handleRegister}
          loading={loading}
          size="large"
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('alreadyHaveAccount')}{' '}
            <Link href="/auth/login" style={styles.link}>
              {t('signIn')}
            </Link>
          </Text>
        </View>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  footer: {
    alignItems: 'center',
    marginTop: 24,
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