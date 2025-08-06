import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert, RefreshControl, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { Platform, Linking } from 'react-native';
import PostCard from '../../components/PostCard';
import PromotionCard from '../../components/PromotionCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationPermissionPrompt } from '../../components/NotificationPermissionPrompt';
import { LocationPermissionPrompt } from '../../components/LocationPermissionPrompt';
import { MedicalAlertsWidget } from '../../components/MedicalAlertsWidget';
import { supabaseClient } from '../../lib/supabase';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);

  useEffect(() => {
    if (currentUser) {
      fetchFeedData();
      setupRealtimeSubscriptions();
    }
    
    return () => {
      // Cleanup subscriptions on unmount
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
      }
    };
  }, [currentUser]);

  const setupRealtimeSubscriptions = () => {
    if (!currentUser) return;
    
    console.log('Setting up real-time subscriptions for feed updates...');
    
    // Subscribe to posts changes (for album posts)
    const subscription = supabaseClient
      .channel('feed-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts'
        }, 
        (payload) => {
          console.log('Posts table changed:', payload);
          handlePostsChange(payload);
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'pet_albums'
        }, 
        (payload) => {
          console.log('Pet albums table changed:', payload);
          handleAlbumsChange(payload);
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'promotions'
        }, 
        (payload) => {
          console.log('Promotions table changed:', payload);
          handlePromotionsChange(payload);
        }
      )
      .subscribe();
    
    setRealtimeSubscription(subscription);
  };

  const handlePostsChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        // New post added - refresh feed to include it
        console.log('New post added, refreshing feed...');
        fetchFeedData();
        break;
        
      case 'DELETE':
        // Post deleted - remove from local state
        console.log('Post deleted, removing from feed...');
        setPosts(prevPosts => prevPosts.filter(post => post.id !== oldRecord.id));
        break;
        
      case 'UPDATE':
        // Post updated - update local state
        console.log('Post updated, updating in feed...');
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === newRecord.id 
              ? {
                  ...post,
                  content: newRecord.content,
                  likes: newRecord.likes || [],
                  albumImages: newRecord.album_images || []
                }
              : post
          )
        );
        break;
    }
  };

  const handleAlbumsChange = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'UPDATE':
        // Album updated - check if sharing status changed
        const wasShared = oldRecord?.is_shared;
        const isNowShared = newRecord?.is_shared;
        
        console.log('Album updated:', {
          albumId: newRecord.id,
          wasShared,
          isNowShared
        });
        
        if (wasShared && !isNowShared) {
          // Album was unshared - remove related posts from feed
          console.log('Album unshared, removing related posts...');
          await removeAlbumPostsFromFeed(newRecord.id);
        } else if (!wasShared && isNowShared) {
          // Album was shared - create new post in feed
          console.log('Album shared, creating new post...');
          await createPostFromSharedAlbum(newRecord);
        }
        break;
        
      case 'DELETE':
        // Album deleted - remove related posts from feed
        console.log('Album deleted, removing related posts...');
        await removeAlbumPostsFromFeed(oldRecord.id);
        break;
    }
  };

  const handlePromotionsChange = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        // New promotion added
        console.log('New promotion added, refreshing...');
        fetchPromotions();
        break;
        
      case 'DELETE':
        // Promotion deleted
        console.log('Promotion deleted, removing from feed...');
        setPromotions(prevPromotions => 
          prevPromotions.filter(promo => promo.id !== oldRecord.id)
        );
        break;
        
      case 'UPDATE':
        // Promotion updated
        console.log('Promotion updated, updating in feed...');
        setPromotions(prevPromotions => 
          prevPromotions.map(promo => 
            promo.id === newRecord.id 
              ? {
                  ...promo,
                  title: newRecord.title,
                  description: newRecord.description,
                  imageURL: newRecord.image_url,
                  ctaText: newRecord.cta_text,
                  ctaUrl: newRecord.cta_url,
                  isActive: newRecord.is_active,
                  likes: newRecord.likes || []
                }
              : promo
          )
        );
        break;
    }
  };

  const removeAlbumPostsFromFeed = async (albumId: string) => {
    try {
      // Delete posts related to this album using album_id
      const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('album_id', albumId);
      
      if (error) {
        console.error('Error deleting album posts:', error);
      } else {
        console.log('Album posts removed from feed');
        // Remove from local state
        setPosts(prevPosts => prevPosts.filter(post => post.album_id !== albumId));
      }
    } catch (error) {
      console.error('Error removing album posts from feed:', error);
    }
  };

  const createPostFromSharedAlbum = async (albumData: any) => {
    try {
      // Get pet data
      const { data: petData, error: petError } = await supabaseClient
        .from('pets')
        .select('*')
        .eq('id', albumData.pet_id)
        .single();
      
      if (petError || !petData) {
        console.error('Error fetching pet data:', petError);
        return;
      }
      
      // Get user data for author info
      const { data: userData, error: userError } = await supabaseClient
        .from('profiles')
        .select('display_name, photo_url')
        .eq('id', albumData.user_id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
      }
      
      // Create post from album
      const postData = {
        user_id: albumData.user_id,
        pet_id: albumData.pet_id,
        content: albumData.description || `Álbum compartido: ${albumData.title} 📸`,
        image_url: albumData.images?.[0] || null,
        album_images: albumData.images || [],
        type: 'album',
        author: {
          name: userData?.display_name || 'Usuario',
          avatar: userData?.photo_url || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100'
        },
        pet: {
          name: petData.name,
          species: petData.species === 'dog' ? 'Perro' : 'Gato'
        },
        likes: [],
        created_at: new Date().toISOString()
      };
      
      const { error: postError } = await supabaseClient
        .from('posts')
        .insert(postData);
      
      if (postError) {
        console.error('Error creating post from shared album:', postError);
      } else {
        console.log('Post created from shared album');
        // The real-time subscription will handle adding it to the feed
      }
    } catch (error) {
      console.error('Error creating post from shared album:', error);
    }
  };
  const fetchFeedData = async () => {
    try {
      // Reset pagination when refreshing
      setCurrentPage(0);
      setHasMorePosts(true);
      setAllPostsLoaded(false);
      await Promise.all([
        fetchPosts(true), // true = reset
        fetchPromotions()
      ]);
    } catch (error) {
      console.error('Error fetching feed data:', error);
    } finally {
      setLoading(false);
      // Add a minimum loading time for better UX
      setTimeout(() => {
        setInitialLoading(false);
      }, 1500);
    }
  };

  const fetchPosts = async (reset: boolean = false) => {
    try {
      const pageSize = 10;
      const page = reset ? 0 : currentPage;
      const offset = page * pageSize;
      
      console.log('Fetching posts:', { page, offset, pageSize, reset });
      
      const { data: postsData, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

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

      if (reset) {
        setPosts(processedPosts);
        setCurrentPage(1);
      } else {
        setPosts(prevPosts => [...prevPosts, ...processedPosts]);
        setCurrentPage(page + 1);
      }
      
      // Check if we've reached the end
      if (postsData && postsData.length < pageSize) {
        setHasMorePosts(false);
        setAllPostsLoaded(true);
        console.log('All posts loaded');
      }
      
      console.log('Posts loaded:', {
        newPosts: processedPosts.length,
        totalPosts: reset ? processedPosts.length : posts.length + processedPosts.length,
        hasMore: postsData && postsData.length >= pageSize
      });
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
      const { data: postData, error: fetchError } = await supabaseClient
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const likes = postData.likes || [];
      const isLiked = likes.includes(currentUser.id);
      
      let newLikes;
      if (doubleTap && !isLiked) {
        newLikes = [...likes, currentUser.id];
      } else if (!doubleTap) {
        newLikes = isLiked
          ? likes.filter((id: string) => id !== currentUser.id)
          : [...likes, currentUser.id];
      } else {
        return;
      }
      
      const { error } = await supabaseClient
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);
      
      if (error) throw error;
      
      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: newLikes }
            : post
        )
      );
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handlePromotionLike = async (promotionId: string) => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    try {
      const { data: promotionData, error: fetchError } = await supabaseClient
        .from('promotions')
        .select('likes')
        .eq('id', promotionId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const likes = promotionData.likes || [];
      const isLiked = likes.includes(currentUser.id);
      
      const newLikes = isLiked
        ? likes.filter((id: string) => id !== currentUser.id)
        : [...likes, currentUser.id];
      
      const { error } = await supabaseClient
        .from('promotions')
        .update({ likes: newLikes })
        .eq('id', promotionId);
      
      if (error) throw error;
      
      // Update local state
      setPromotions(prevPromotions => 
        prevPromotions.map(promo => 
          promo.id === promotionId 
            ? { ...promo, likes: newLikes }
            : promo
        )
      );
    } catch (error) {
      console.error('Error updating promotion like:', error);
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
              const { Linking } = require('react-native');
              const supported = await Linking.canOpenURL(promotion.ctaUrl);
              if (supported) {
                await Linking.openURL(promotion.ctaUrl);
              } else {
                console.error('URL not supported:', promotion.ctaUrl);
                Alert.alert('Error', 'No se puede abrir este enlace');
              }
            }
          } catch (error) {
            console.error('Error opening external link:', error);
            Alert.alert('Error', 'No se pudo abrir el enlace');
          }
        } else {
          console.warn('Invalid URL format:', promotion.ctaUrl);
          Alert.alert('Error', 'Formato de enlace inválido');
        }
      } else if (promotion.partnerId) {
        // Fallback: Navigate to partner profile if no CTA URL
        console.log('No CTA URL, navigating to partner:', promotion.partnerId);
        router.push(`/services/partner/${promotion.partnerId}`);
      } else {
        // No action defined
        console.log('No action defined for promotion');
        Alert.alert('Información', 'Esta promoción no tiene enlace configurado');
      }
      
      console.log('=== END PROMOTION CLICK DEBUG ===');
    } catch (error) {
      console.error('Error handling promotion press:', error);
      Alert.alert('Error', `Error al procesar la promoción: ${error.message}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setFollowStatesLoaded(false); // Reset follow states en refresh
    await fetchFeedData();
    setRefreshing(false);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DogCatiFy</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
});