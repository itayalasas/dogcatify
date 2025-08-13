import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert, RefreshControl, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import PostCard from '../../components/PostCard';
import PromotionCard from '../../components/PromotionCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPermissionPrompt } from '../../components/NotificationPermissionPrompt';
import { LocationPermissionPrompt } from '../../components/LocationPermissionPrompt';
import { MedicalAlertsWidget } from '../../components/MedicalAlertsWidget';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabaseClient } from '@/lib/supabase';

// Debug component for production notification testing
const NotificationDebugInfo = () => {
  const { expoPushToken } = useNotifications();
  const isExpoGo = Constants.appOwnership === 'expo';
  
  // Only show in development or when there are issues
  if (!__DEV__ && expoPushToken) return null;
  
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>🔔 Estado de Notificaciones</Text>
      <Text style={styles.debugText}>
        Entorno: {isExpoGo ? 'Expo Go' : 'Build nativo'}
      </Text>
      <Text style={styles.debugText}>
        Token: {expoPushToken ? '✅ Configurado' : '❌ No disponible'}
      </Text>
      <Text style={styles.debugText}>
        Plataforma: {Platform.OS}
      </Text>
      {!expoPushToken && !isExpoGo && (
        <Text style={styles.debugWarning}>
          ⚠️ Las notificaciones no están funcionando. Verifica la configuración.
        </Text>
      )}
    </View>
  );
};

// Loading component with app logo
const FeedLoader = () => {
  const fadeAnim = new Animated.Value(0.3);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <View style={styles.loaderContainer}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={styles.loaderLogo}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={styles.loaderText}>Cargando tu feed...</Text>
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
    </View>
  );
};

// Componente wrapper para manejar las vistas de promociones
const PromotionWrapper = ({ promotion, onPress, onLike }: { promotion: any; onPress: () => void; onLike: (promotionId: string) => void }) => {
  useEffect(() => {
    // Incrementar vistas cuando la promoción se renderiza
    const incrementViews = async () => {
      try {
        const { error } = await supabaseClient
          .from('promotions')
          .update({ 
            views: (promotion.views || 0) + 1 
          })
          .eq('id', promotion.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error incrementing promotion views:', error);
      }
    };

    incrementViews();
  }, [promotion.id]);

  return (
    <PromotionCard
      promotion={promotion}
      onPress={onPress}
      onLike={onLike}
    />
  );
};

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchFeedData();
    }
  }, [currentUser]);

  const fetchFeedData = async () => {
    try {
      await Promise.all([
        fetchPosts(),
        fetchPromotions()
      ]);
    } catch (error) {
      console.error('Error fetching feed data:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setInitialLoading(false);
      }, 1500);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const processedPosts = postsData?.map(post => ({
        id: post.id,
        userId: post.user_id,
        petId: post.pet_id,
        content: post.content,
        imageURL: post.image_url,
        albumImages: post.album_images || [],
        likes: post.likes || [],
        createdAt: new Date(post.created_at),
        author: post.author || { name: 'Usuario', avatar: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100' },
        pet: post.pet || { name: 'Mascota', species: 'Perro' },
        timeAgo: getTimeAgo(new Date(post.created_at)),
        type: post.type || 'single'
      })) || [];

      setPosts(processedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchPromotions = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data: promotionsData, error } = await supabaseClient
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedPromotions = promotionsData?.map(promo => ({
        id: promo.id,
        title: promo.title,
        description: promo.description,
        imageURL: promo.image_url,
        ctaText: promo.cta_text || 'Más información',
        ctaUrl: promo.cta_url,
        partnerId: promo.partner_id,
        views: promo.views || 0,
        clicks: promo.clicks || 0,
        likes: promo.likes || []
      })) || [];

      setPromotions(processedPromotions);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  // Intercalar promociones en el feed cada 3 posts
  useEffect(() => {
    const interleaveFeedItems = () => {
      const items = [];
      
      if (promotions.length > 0) {
        // Crear una copia aleatoria de promociones para variar el orden
        const shuffledPromotions = [...promotions].sort(() => Math.random() - 0.5);
        let promoIndex = 0;

        // Determinar intervalo dinámico basado en cantidad de posts
        let interval;
        if (posts.length <= 5) {
          interval = 2; // Con pocos posts, mostrar cada 2 posts
        } else if (posts.length <= 10) {
          interval = 3; // Con posts moderados, cada 3 posts
        } else {
          interval = 5; // Con muchos posts, cada 5 posts
        }

        for (let i = 0; i < posts.length; i++) {
          items.push({ type: 'post', data: posts[i] });
          
          // Insertar promoción según el intervalo dinámico
          if ((i + 1) % interval === 0 && promoIndex < shuffledPromotions.length) {
            items.push({ type: 'promotion', data: shuffledPromotions[promoIndex] });
            promoIndex++;
            
            // Si se acabaron las promociones, reiniciar con orden aleatorio
            if (promoIndex >= shuffledPromotions.length) {
              shuffledPromotions.sort(() => Math.random() - 0.5);
              promoIndex = 0;
            }
          }
        }
        
        // Si no se insertó ninguna promoción y hay posts, agregar una al final
        if (posts.length > 0 && !items.some(item => item.type === 'promotion')) {
          items.push({ type: 'promotion', data: shuffledPromotions[0] });
        }
      } else {
        // Si no hay promociones, solo agregar posts
        posts.forEach(post => {
          items.push({ type: 'post', data: post });
        });
      }

      setFeedItems(items);
    };

    if (posts.length > 0 || promotions.length > 0) {
      interleaveFeedItems();
    }
  }, [posts, promotions]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Ahora';
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString();
  };

  const handleLike = async (postId: string, doubleTap: boolean = false) => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    try {
      console.log('=== LIKE DEBUG START ===');
      console.log('Post ID:', postId);
      console.log('User ID:', currentUser.id);
      console.log('Double tap:', doubleTap);
      
      // Get fresh data from database to avoid stale state
      const { data: postData, error: fetchError } = await supabaseClient
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();
      
      if (fetchError) throw fetchError;
      
      console.log('Current likes from DB:', postData.likes);
      
      const likes = postData.likes || [];
      const isLiked = likes.includes(currentUser.id);
      
      console.log('Is currently liked:', isLiked);
      
      let newLikes;
      if (doubleTap && !isLiked) {
        newLikes = [...likes, currentUser.id];
      } else if (!doubleTap) {
        newLikes = isLiked
          ? likes.filter((id: string) => id !== currentUser.id)
          : [...likes, currentUser.id];
      } else {
        console.log('Double tap on already liked post, no action');
        return;
      }
      
      console.log('New likes array:', newLikes);
      
      // Update database first
      const { error } = await supabaseClient
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);
      
      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('Database updated successfully');
      
      // Verify the update worked by fetching again
      const { data: verifyData, error: verifyError } = await supabaseClient
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
        Alert.alert('Error', 'No se pudo verificar la actualización del like');
        return;
      } else {
        console.log('✅ Verification - likes in DB after update:', verifyData.likes);
        if (JSON.stringify(verifyData.likes?.sort()) !== JSON.stringify(newLikes.sort())) {
          console.error('❌ Update not persisted! Expected:', newLikes, 'Got:', verifyData.likes);
          Alert.alert('Error', 'Los likes no se guardaron correctamente en la base de datos');
          return;
        } else {
          console.log('✅ Update verified successfully in database');
        }
      }
      
      // Update local state only after successful database update
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: newLikes }
            : post
        )
      );
      
      // Also update feedItems state to keep consistency
      setFeedItems(prevItems => 
        prevItems.map(item => 
          item.type === 'post' && item.data.id === postId
            ? { ...item, data: { ...item.data, likes: newLikes } }
            : item
        )
      );
      
      console.log('Local state updated');
      console.log('=== LIKE DEBUG END ===');
    } catch (error) {
      console.error('Error updating like:', error);
      Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta nuevamente.');
      Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta nuevamente.');
    }
  };

  const handlePromotionLike = async (promotionId: string) => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    try {
      console.log('=== PROMOTION LIKE DEBUG START ===');
      console.log('Promotion ID:', promotionId);
      console.log('User ID:', currentUser.id);
      
      // Get fresh data from database
      const { data: promotionData, error: fetchError } = await supabaseClient
        .from('promotions')
        .select('likes')
        .eq('id', promotionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      console.log('Current promotion likes from DB:', promotionData.likes);
      
      const likes = promotionData.likes || [];
      const isLiked = likes.includes(currentUser.id);
      
      console.log('Is currently liked:', isLiked);
      
      const newLikes = isLiked
        ? likes.filter((id: string) => id !== currentUser.id)
        : [...likes, currentUser.id];
      
      console.log('New likes array:', newLikes);
      
      // Update database first
      const { error } = await supabaseClient
        .from('promotions')
        .update({ likes: newLikes })
        .eq('id', promotionId);
      
      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('Database updated successfully');
      
      // Verify the update worked by fetching again
      const { data: verifyData, error: verifyError } = await supabaseClient
        .from('promotions')
        .select('likes')
        .eq('id', promotionId)
        .single();
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError);
        Alert.alert('Error', 'No se pudo verificar la actualización del like');
        return;
      } else {
        console.log('✅ Verification - likes in DB after update:', verifyData.likes);
        if (JSON.stringify(verifyData.likes?.sort()) !== JSON.stringify(newLikes.sort())) {
          console.error('❌ Update not persisted! Expected:', newLikes, 'Got:', verifyData.likes);
          Alert.alert('Error', 'Los likes no se guardaron correctamente en la base de datos');
          return;
        } else {
          console.log('✅ Update verified successfully in database');
        }
      }
      
      // Update local state only after successful database update
      setPromotions(prevPromotions => 
        prevPromotions.map(promo => 
          promo.id === promotionId 
            ? { ...promo, likes: newLikes }
            : promo
        )
      );
      
      // Also update feedItems state
      setFeedItems(prevItems => 
        prevItems.map(item => 
          item.type === 'promotion' && item.data.id === promotionId
            ? { ...item, data: { ...item.data, likes: newLikes } }
            : item
        )
      );
      
      console.log('Local state updated');
      console.log('=== PROMOTION LIKE DEBUG END ===');
    } catch (error) {
      console.error('Error updating promotion like:', error);
      Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta nuevamente.');
    }
  };

  const handleComment = (postId: string, post?: any) => {
    // Navigate to comments screen or open comments modal
    console.log('Open comments for post:', postId);
  };

  const handleShare = (postId: string) => {
    // Handle share functionality
    console.log('Share post:', postId);
  };

  const handlePromotionPress = async (promotion: any) => {
    try {
      console.log('=== PROMOTION CLICK DEBUG ===');
      console.log('Promotion ID:', promotion.id);
      console.log('Current clicks:', promotion.clicks);
      console.log('CTA URL:', promotion.ctaUrl);
      console.log('Current user ID:', currentUser?.id);
      
      // Increment clicks
      console.log('Attempting to increment clicks...');
      
      const newClicksCount = (promotion.clicks || 0) + 1;
      
      // Use direct API call with proper authentication
      try {
        // Get current user token for authentication
        const token = await supabaseClient.auth.getSession();
        const accessToken = token.data?.session?.access_token;
        
        console.log('Has access token:', !!accessToken);
        
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        
        const headers = {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Prefer': 'return=representation'
        };
        
        // Add authorization header if we have a token
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        console.log('Making API call with headers:', Object.keys(headers));
        
        const response = await fetch(`${supabaseUrl}/rest/v1/promotions?id=eq.${promotion.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            clicks: newClicksCount
          })
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('API response data:', responseData);
        
        console.log('Clicks incremented successfully. New count:', newClicksCount);
        
        // Verify the update worked
        console.log('Verifying update in database...');
        const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/promotions?id=eq.${promotion.id}&select=clicks`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseKey}`
          }
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Database verification - clicks value:', verifyData[0]?.clicks);
          
          if (verifyData[0]?.clicks === newClicksCount) {
            console.log('✅ Update verified successfully in database');
          } else {
            console.log('❌ Update not reflected in database');
          }
        }
        
      } catch (error) {
        console.error('Error incrementing clicks:', error);
        // Don't throw error, continue with navigation
      }
      
      // Update local state to reflect the click increment
      setPromotions(prevPromotions => 
        prevPromotions.map(promo => 
          promo.id === promotion.id 
            ? { ...promo, clicks: newClicksCount }
            : promo
        )
      );
      
      // Also update feedItems state
      setFeedItems(prevItems => 
        prevItems.map(item => 
          item.type === 'promotion' && item.data.id === promotion.id
            ? { ...item, data: { ...item.data, clicks: newClicksCount } }
            : item
        )
      );
      
      console.log('Local state updated. New clicks:', newClicksCount);

      // Handle promotion CTA URL
      if (promotion.ctaUrl) {
        console.log('Opening promotion URL:', promotion.ctaUrl);
        
        if (promotion.ctaUrl.startsWith('dogcatify://')) {
          // Handle internal app links
          const urlParts = promotion.ctaUrl.replace('dogcatify://', '').split('/');
          const type = urlParts[0]; // 'services', 'products', 'partners'
          const id = urlParts[1];
          
          console.log('Internal link - Type:', type, 'ID:', id);
          
          switch (type) {
            case 'services':
              console.log('Navigating to service:', id);
              router.push(`/services/${id}`);
              break;
            case 'products':
              console.log('Navigating to product:', id);
              router.push(`/products/${id}`);
              break;
            case 'partners':
              console.log('Navigating to partner:', id);
              router.push(`/services/partner/${id}`);
              break;
            default:
              console.warn('Unknown internal link type:', type);
          }
        } else if (promotion.ctaUrl.startsWith('http')) {
          // Handle external links
          console.log('External link detected:', promotion.ctaUrl);
          try {
            if (Platform.OS === 'web') {
              console.log('Opening in web browser');
              window.open(promotion.ctaUrl, '_blank');
            } else {
              console.log('Opening with Linking API');
              const supported = await Linking.canOpenURL(promotion.ctaUrl);
              if (supported) {
                await Linking.openURL(promotion.ctaUrl);
              } else {
                console.error('URL not supported:', promotion.ctaUrl);
                Alert.alert('Error', 'No se puede abrir este enlace');
              }
            }
          } catch (error) {
            console.error('Error opening URL:', error);
            Alert.alert('Error', 'No se pudo abrir el enlace');
          }
        }
      }
    } catch (error) {
      console.error('Error handling promotion press:', error);
    }
  };

  // Manejar redirección cuando no hay usuario - FUERA del render condicional
  useEffect(() => {
    if (!currentUser) {
      const timer = setTimeout(() => {
        router.replace('/auth/login');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Show initial loader while feed is loading
  if (initialLoading) {
    return <FeedLoader />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <NotificationPermissionPrompt />
      <LocationPermissionPrompt />
      {__DEV__ && <NotificationDebugInfo />}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DogCatiFy</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchFeedData}
            colors={['#2D6A6F']}
            tintColor="#2D6A6F"
          />
        }
      >
        <MedicalAlertsWidget />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Cargando feed...</Text>
          </View>
        ) : feedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('noPostsYet')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('beFirstToPost')}
            </Text>
          </View>
        ) : (
          feedItems.map((item, index) => {
            if (item.type === 'promotion') {
              return (
                <PromotionWrapper
                  key={`promotion-${item.data.id}-${index}`}
                  promotion={item.data}
                  onPress={() => handlePromotionPress(item.data)}
                  onLike={handlePromotionLike}
                />
              );
            } else {
              return (
                <PostCard
                  key={`post-${item.data.id}-${index}`}
                  post={item.data}
                  onLike={handleLike}
                  onComment={handleComment}
                  onShare={handleShare}
                  currentUserId={currentUser?.id}
                />
              );
            }
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  authTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
    textAlign: 'center',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Loader styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 30,
  },
  logoContainer: {
    marginBottom: 32,
  },
  loaderLogo: {
    width: 120,
    height: 120,
  },
  loaderText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#2D6A6F',
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D6A6F',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    marginBottom: 4,
  },
  debugWarning: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginTop: 8,
  },
});