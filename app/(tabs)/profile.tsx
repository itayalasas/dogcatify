import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Edit, 
  ChevronRight, 
  ShoppingBag, 
  Bell, 
  Globe, 
  HelpCircle, 
  LogOut,
  Fingerprint,
  Store,
  Shield,
  Trash2,
  CreditCard
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBiometric } from '@/contexts/BiometricContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  is_admin?: boolean;
}

interface PartnerProfile {
  id: string;
  business_name: string;
  is_verified: boolean;
}

interface UserStats {
  followers: number;
  following: number;
  posts: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    biometricType, 
    toggleBiometric 
  } = useBiometric();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      
      // Subscribe to profile changes for real-time updates
      const profileSubscription = supabase
        .channel('profile-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, 
          () => {
            console.log('Profile updated, reloading stats...');
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        profileSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch partner profile if exists
      const { data: partnerData } = await supabase
        .from('partner_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setPartnerProfile(partnerData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get followers count - people who follow this user
      const { count: followersCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', user.id);

      // Get following count - people this user follows
      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      // Get posts count
      const { count: postsCount } = await supabase
        .from('pet_albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      console.log('Stats loaded:', { 
        followers: followersCount || 0, 
        following: followingCount || 0, 
        posts: postsCount || 0 
      });

      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        posts: postsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleMyOrders = () => {
    router.push('/orders');
  };

  const handlePartnerMode = () => {
    router.push('/partner-register');
  };

  const handleLanguageChange = () => {
    toggleLanguage();
  };

  const handleToggleBiometric = async () => {
    try {
      await toggleBiometric();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar la configuración biométrica');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('signOut'),
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('signOut'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          }
        }
      ]
    );
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>{t('profile')}</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Edit size={24} color="#2D6A6F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image
              source={{ 
                uri: profile.avatar_url || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
              }}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.full_name || 'Usuario'}
              </Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              {profile.bio && (
                <Text style={styles.profileBio}>{profile.bio}</Text>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>{t('posts')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.followers}</Text>
              <Text style={styles.statLabel}>{t('followers')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.following}</Text>
              <Text style={styles.statLabel}>{t('following')}</Text>
            </View>
          </View>
        </Card>

        {/* Admin Panel */}
        {profile.is_admin && (
          <Card style={styles.adminCard}>
            <TouchableOpacity 
              style={styles.adminOption}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.adminInfo}>
                <Shield size={24} color="#DC2626" />
                <View style={styles.adminDetails}>
                  <Text style={styles.adminTitle}>Panel de Administrador</Text>
                  <Text style={styles.adminDescription}>
                    Gestionar usuarios, contenido y configuraciones del sistema
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#DC2626" />
            </TouchableOpacity>
          </Card>
        )}

        {/* Partner Section */}
        <Card style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <Store size={24} color="#2D6A6F" />
            <Text style={styles.partnerTitle}>Modo Negocio</Text>
          </View>
          
          {partnerProfile ? (
            <View style={styles.partnerActive}>
              <Text style={styles.partnerActiveText}>
                ¡Tu negocio está activo!
              </Text>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{partnerProfile.business_name}</Text>
                {partnerProfile.is_verified && (
                  <Text style={styles.verifiedBadge}>✓ Verificado</Text>
                )}
              </View>
              <View style={styles.partnerButtons}>
                <Button
                  title="Gestionar Negocio"
                  onPress={() => router.push('/partner/configure-business')}
                  size="large"
                  style={styles.partnerButton}
                />
                <Button
                  title="Registrar Otro Negocio"
                  onPress={() => router.push('/(tabs)/partner-register')}
                  variant="outline"
                  size="large"
                  style={styles.partnerButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.partnerInactive}>
              <Button
                title={t('registerBusiness')}
                onPress={handlePartnerMode}
                size="large"
              />
            </View>
          )}
        </Card>

        {/* Menu Options */}
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuOption} onPress={handleEditProfile}>
            <View style={styles.menuOptionLeft}>
              <Edit size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>Editar perfil</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuOption} onPress={handleMyOrders}>
            <View style={styles.menuOptionLeft}>
              <ShoppingBag size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('myOrders')}</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuOption} onPress={() => router.push('/cart')}>
            <View style={styles.menuOptionLeft}>
              <ShoppingBag size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>Mi Carrito</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>

          {partnerProfile && (
            <TouchableOpacity 
              style={styles.menuOption} 
              onPress={() => router.push('/profile/mercadopago-config')}
            >
              <View style={styles.menuOptionLeft}>
                <CreditCard size={20} color="#6B7280" />
                <Text style={styles.menuOptionText}>Configurar Mercado Pago</Text>
              </View>
              <ChevronRight size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Settings */}
        <Card style={styles.menuCard}>
          <View style={styles.menuOption}>
            <View style={styles.menuOptionLeft}>
              <Bell size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('notifications')}</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#E5E7EB', true: '#2D6A6F' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isBiometricSupported && (
            <View style={styles.menuOption}>
              <View style={styles.menuOptionLeft}>
                <Fingerprint size={20} color="#6B7280" />
                <Text style={styles.menuOptionText}>
                  {biometricType || t('biometricAuth')}
                </Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#E5E7EB', true: '#2D6A6F' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          <TouchableOpacity style={styles.menuOption} onPress={handleLanguageChange}>
            <View style={styles.menuOptionLeft}>
              <Globe size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('language')}</Text>
            </View>
            <View style={styles.languageIndicator}>
              <Text style={styles.languageText}>
                {language === 'es' ? t('spanish') : t('english')}
              </Text>
              <ChevronRight size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuOption} 
            onPress={() => router.push('/profile/help-support')}
          >
            <View style={styles.menuOptionLeft}>
              <HelpCircle size={20} color="#6B7280" />
              <Text style={styles.menuOptionText}>{t('helpSupport')}</Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </TouchableOpacity>
        </Card>

        {/* Advanced Settings */}
        <Card style={styles.menuCard}>
          <TouchableOpacity 
            style={styles.menuOption} 
            onPress={() => router.push('/profile/delete-account')}
          >
            <View style={styles.menuOptionLeft}>
              <Trash2 size={20} color="#EF4444" />
              <Text style={[styles.menuOptionText, styles.dangerText]}>Eliminar cuenta</Text>
            </View>
            <ChevronRight size={16} color="#EF4444" />
          </TouchableOpacity>
        </Card>
        {/* Logout */}
        <Card style={styles.logoutCard}>
          <TouchableOpacity style={styles.logoutOption} onPress={handleLogout}>
            <LogOut size={20} color="#10B981" />
            <Text style={[styles.logoutText, styles.logoutTextGreen]}>{t('signOut')}</Text>
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
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  editButton: {
    padding: 8,
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
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  adminCard: {
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  adminOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminDetails: {
    marginLeft: 12,
    flex: 1,
  },
  adminTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 2,
  },
  adminDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 18,
  },
  partnerCard: {
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  partnerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D6A6F',
    marginLeft: 8,
  },
  partnerButtons: {
    gap: 12,
    width: '100%',
  },
  partnerButton: {
    width: '100%',
  },
  partnerActive: {
    alignItems: 'center',
  },
  partnerActiveText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 12,
  },
  businessInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  partnerInactive: {
    alignItems: 'center',
  },
  partnerInactiveText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  partnerDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  menuCard: {
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginLeft: 12,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 8,
  },
  logoutCard: {
    marginBottom: 32,
  },
  logoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
  logoutTextGreen: {
    color: '#10B981',
  },
  dangerText: {
    color: '#EF4444',
  },
});