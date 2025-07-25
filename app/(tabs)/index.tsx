import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Image, Dimensions, ActivityIndicator, Share, Alert } from 'react-native';
import PostCard from '../../components/PostCard';
import { PromotionCard } from '../../components/PromotionCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient, getPosts } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchPosts(true);
      fetchPromotions();
      
      // Set up real-time subscription for promotions
      const promotionsSubscription = supabaseClient
        .channel('promotions-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'promotions'
          }, 
          (payload) => {
            console.log('Promotion change detected:', payload);
            fetchPromotions();
          }
        )
        .subscribe();
      
      return () => {
        promotionsSubscription.unsubscribe();
      };
    }
  }, [currentUser]);

  const fetchPromotions = async () => {
    try {
      console.log('Fetching promotions...');
      const { data, error } = await supabaseClient
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching promotions:', error);
        return;
      }
      
      console.log('Promotions fetched:', data?.length || 0);
      const promotionsData = data?.map(promo => ({
        id: promo.id,
        type: 'promotion',
        title: promo.title,
        description: promo.description,
        imageURL: promo.image_url,
        ctaText: promo.cta_text || 'Más información',
        ctaUrl: promo.cta_url,
        partnerId: promo.partner_id,
        startDate: new Date(promo.start_date),
        endDate: new Date(promo.end_date),
        views: promo.views || 0,
        clicks: promo.clicks || 0,
        createdAt: new Date(promo.created_at),
      })) || [];
      
      setPromotions(promotionsData);
      console.log('Promotions state updated:', promotionsData.length);
      
      // Log promotion details for debugging
      promotionsData.forEach(promo => {
        console.log(`Promotion: ${promo.title}, Start: ${promo.startDate}, End: ${promo.endDate}, Active: ${promo.startDate <= new Date() && promo.endDate >= new Date()}`);
      });
      
      // Force update feed items with new promotions
      combineFeedItems(posts, promotionsData);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    }
  };

  const fetchPosts = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    } else {
      if (!hasMore || refreshing) return;
      setRefreshing(true);
    }
    
    try {
      const pageSize = 5;
      const currentPage = reset ? 1 : page;
      
      const offset = (currentPage - 1) * pageSize;
      const data = await getPosts(pageSize, offset);
      
      // Check if we have more posts to load (simplified check)
      setHasMore(data && data.length === pageSize);
      
      const postsData = data.map((post: any) => {
        // Process image URLs to ensure they're complete
        let imageURL = post.image_url;
        if (imageURL && imageURL.startsWith('/storage/v1/object/public/')) {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
          imageURL = `${supabaseUrl}${imageURL}`;
        }
        
        // Process album images
        let albumImages = post.album_images || [];
        if (albumImages.length > 0) {
          albumImages = albumImages.map((img: string) => {
            if (img && img.startsWith('/storage/v1/object/public/')) {
              const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
              return `${supabaseUrl}${img}`;
            }
            return img;
          });
        }

        return {
          id: post.id,
          userId: post.user_id,
          petId: post.pet_id,
          content: post.content,
          imageURL: imageURL,
          albumImages: albumImages,
          likes: post.likes || [],
          createdAt: new Date(post.created_at),
          timeAgo: getTimeAgo(new Date(post.created_at)),
          author: {
            name: post.profiles?.display_name || 'Usuario',
            avatar: post.profiles?.photo_url || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100',
          },
          pet: {
            name: post.pets?.name || 'Mascota',
            species: post.pets?.species || 'unknown',
          },
          type: post.type || (post.albumImages && post.albumImages.length > 0 ? 'album' : 'single')
        };
      });
      
      if (reset) {
        setPosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }
      
      if (!reset) {
        setPage(currentPage + 1);
      }
      
      // Combine posts with promotions for feed
      const allPosts = reset ? postsData : [...posts, ...postsData];
      combineFeedItems(allPosts, promotions);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const combineFeedItems = (postsData: any[], promotionsData: any[] = promotions) => {
    console.log('Combining feed items:', {
      posts: postsData.length,
      promotions: promotionsData.length
    });
    
    const combined: any[] = [];
    
    // Always try to combine, even if one array is empty
    if (promotionsData.length > 0 && postsData.length > 0) {
      // Intercalar promociones cada 3 posts
      let postIndex = 0;
      let promoIndex = 0;
      
      while (postIndex < postsData.length || promoIndex < promotionsData.length) {
        // Agregar 3 posts
        for (let i = 0; i < 3 && postIndex < postsData.length; i++) {
          combined.push(postsData[postIndex]);
          postIndex++;
        }
        
        // Agregar 1 promoción si hay disponible
        if (promoIndex < promotionsData.length && combined.length > 0) {
          combined.push(promotionsData[promoIndex]);
          promoIndex++;
        }
      }
    } else if (promotionsData.length > 0) {
      // Solo promociones disponibles
      combined.push(...promotionsData);
    } else if (postsData.length > 0) {
      // Solo posts disponibles
      combined.push(...postsData);
    } else {
      // No hay contenido
      console.log('No content available for feed');
    }
    
    console.log('Final feed items:', combined.length);
    setFeedItems(combined);
  };

  useEffect(() => {
    if (posts.length > 0 || promotions.length > 0) {
      combineFeedItems(posts, promotions);
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

  const handleLike = async (postId: string, doubleTap = false) => {
    if (!currentUser) return;
    
    try {
      // First get the current post to check if user already liked it
      const { data: post, error: fetchError } = await supabaseClient
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the likes array
      const likes = post.likes || [];
      const userAlreadyLiked = likes.includes(currentUser.id);
      
      // If it's a double tap and already liked, don't unlike
      if (doubleTap && userAlreadyLiked) {
        return;
      }
      
      const newLikes = userAlreadyLiked
        ? likes.filter((id: string) => id !== currentUser.id)
        : [...likes, currentUser.id];
      
      // Update the post
      const { error: updateError } = await supabaseClient
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: newLikes
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId);
  };
  
  const handleShare = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      const shareMessage = `¡Mira esta publicación de ${post.author?.name} en DogCatiFy!`;
      const shareUrl = post.imageURL || 'https://dogcatify.com';
      
      await Share.share({
        message: shareMessage,
        url: shareUrl,
      });
      
      console.log('Shared post:', postId);
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'No se pudo compartir la publicación');
    }
  };

  const handlePromotionView = async (promotionId: string) => {
    try {
      // Increment views
      const { error } = await supabaseClient
        .from('promotions')
        .rpc('increment_promotion_views', { promotion_id: promotionId });
      
      if (error) {
        console.error('Error incrementing views:', error);
      }
    } catch (error) {
      console.error('Error handling promotion view:', error);
    }
  };

  const handlePromotionClick = async (promotionId: string, url?: string) => {
    try {
      console.log('Promotion clicked:', promotionId);
      // Increment clicks
      const { error } = await supabaseClient
        .from('promotions')
        .rpc('increment_promotion_clicks', { promotion_id: promotionId });
      
      if (error) {
        console.error('Error incrementing clicks:', error);
      }
      
      if (url) {
        console.log('Opening promotion URL:', url);
        // Here you could open the URL with Linking.openURL(url)
      }
    } catch (error) {
      console.error('Error handling promotion click:', error);
    }
  };

  const renderFeedItem = ({ item }: { item: any }) => {
    if (item.type === 'promotion') {
      // Incrementar vistas cuando se renderiza la promoción (solo una vez)
      React.useEffect(() => {
        const timer = setTimeout(() => {
          handlePromotionView(item.id);
        }, 1000); // Delay para evitar múltiples llamadas
        
        return () => clearTimeout(timer);
      }, [item.id]);
      
      return (
        <PromotionCard
          promotion={item}
          onPress={() => {
            handlePromotionClick(item.id, item.ctaUrl);
          }}
        />
      );
    }

    return (
      <PostCard
        post={item}
        onLike={() => handleLike(item.id)}
        onComment={() => handleComment(item.id)}
        onShare={() => handleShare(item.id)}
      />
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
          />
          <Text style={styles.appName}>DogCatiFy</Text>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasMore && fetchPosts(false)}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={() => {
            fetchPosts(true);
            fetchPromotions();
          }}
          ListFooterComponent={renderFooter}
        />
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 8,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#2D6A6F',
  },
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
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
    marginTop: 10,
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
    color: '#2D6A6F',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});