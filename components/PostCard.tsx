import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Modal, TextInput, FlatList, ActivityIndicator, ScrollView, Image, Share } from 'react-native';
import { Heart, MessageCircle, Share2, MoveHorizontal as MoreHorizontal, ArrowLeft, Send } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabaseClient } from '../lib/supabase';
import { FollowButton } from './FollowButton';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: any;
  isMock?: boolean;
  onLike: (postId: string, doubleTap?: boolean) => void;
  onComment: (postId: string, post?: any) => void;
  onShare: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  isMock = false, 
  onLike, 
  onComment, 
  onShare 
}) => {
  const { currentUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [doubleTapTimer, setDoubleTapTimer] = useState<NodeJS.Timeout | null>(null);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (currentUser && post.likes) {
      setLiked(post.likes.includes(currentUser.id));
    }
    setLikesCount(post.likes?.length || 0);
    
    // Fetch comments
    if (showCommentsModal) {
      fetchComments();
    } else {
      fetchCommentsCount();
    }
  }, [post.likes, currentUser]);

  useEffect(() => {
    if (showCommentsModal) {
      fetchComments();
    }
  }, [showCommentsModal]);

  const fetchCommentsCount = async () => {
    try {
      const { count, error } = await supabaseClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (error) throw error;
      setCommentsCount(count || 0);
    } catch (error) {
      console.error('Error fetching comments count:', error);
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      console.log('Fetching comments for post:', post.id);
      const { data: commentsData, error } = await supabaseClient
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      console.log('Raw comments data:', commentsData);
      
      // Fetch user profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          try {
            const { data: profileData, error: profileError } = await supabaseClient
              .from('profiles')
              .select('display_name, photo_url')
              .eq('id', comment.user_id)
              .single();
            
            if (profileError) {
              console.error('Error fetching profile for comment:', profileError);
              return {
                ...comment,
                profiles: null
              };
            }
            
            return {
              ...comment,
              profiles: profileData
            };
          } catch (error) {
            console.error('Error processing comment profile:', error);
            return {
              ...comment,
              profiles: null
            };
          }
        })
      );
      
      console.log('Comments with profiles:', commentsWithProfiles);
      
      // Organize comments into threads (parent comments with their replies)
      const organizedComments = organizeCommentsIntoThreads(commentsWithProfiles);
      console.log('Organized comments:', organizedComments);
      setComments(organizedComments);
      setCommentsCount(commentsWithProfiles.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const organizeCommentsIntoThreads = (comments: any[]) => {
    console.log('Organizing comments into threads:', comments);
    
    if (!comments || comments.length === 0) {
      console.log('No comments to organize');
      return [];
    }
    
    const parentComments = comments.filter(comment => !comment.parent_id);
    const replies = comments.filter(comment => comment.parent_id);
    
    console.log('Parent comments:', parentComments.length);
    console.log('Replies:', replies.length);
    
    // Add replies to their parent comments
    const threaded = parentComments.map(parent => {
      const parentReplies = replies.filter(reply => reply.parent_id === parent.id);
      return {
        ...parent,
        replies: parentReplies
      };
    });
    
    console.log('Threaded comments result:', threaded);
    return threaded;
  };

  const getCommentAuthorName = (comment: any) => {
    // Verificar que comment existe
    if (!comment) return 'Usuario';
    
    // Priorizar el display_name del perfil actual
    if (comment.profiles && comment.profiles.display_name) {
      return comment.profiles.display_name;
    }
    
    // Si es el usuario actual, usar su información
    if (comment.user_id === currentUser?.id && currentUser?.displayName) {
      return currentUser.displayName;
    }
    
    // Fallback al author guardado en el comentario
    if (comment.author && comment.author.name) {
      return comment.author.name;
    }
    
    // Último recurso
    return 'Usuario';
  };

  const getCommentAuthorAvatar = (comment: any) => {
    // Verificar que comment existe
    if (!comment) return 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100';
    
    // Priorizar la photo_url del perfil actual
    if (comment.profiles && comment.profiles.photo_url) {
      return comment.profiles.photo_url;
    }
    
    // Si es el usuario actual, usar su información
    if (comment.user_id === currentUser?.id && currentUser?.photoURL) {
      return currentUser.photoURL;
    }
    
    // Fallback al avatar guardado en el comentario
    if (comment.author && comment.author.avatar) {
      return comment.author.avatar;
    }
    
    // Imagen por defecto
    return 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100';
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const commentData: any = {
        post_id: post.id,
        user_id: currentUser.id,
        content: newComment.trim(),
        likes: []
      };
      
      // Add parent_id if replying to a comment
      if (replyTo) {
        commentData.parent_id = replyTo.id;
      }

      const { error } = await supabaseClient
        .from('comments')
        .insert(commentData);

      if (error) throw error;

      setNewComment('');
      setReplyTo(null);
      fetchComments();
      fetchCommentsCount();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'No se pudo agregar el comentario');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!currentUser) return;

    try {
      const { data: commentData, error: fetchError } = await supabaseClient
        .from('comments')
        .select('likes')
        .eq('id', commentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const likes = commentData.likes || [];
      const isLiked = likes.includes(currentUser.id);
      
      let newLikes;
      if (isLiked) {
        newLikes = likes.filter((id: string) => id !== currentUser.id);
      } else {
        newLikes = [...likes, currentUser.id];
      }
      
      const { error } = await supabaseClient
        .from('comments')
        .update({ likes: newLikes })
        .eq('id', commentId);
      
      if (error) throw error;
      
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, likes: newLikes }
          : comment
      ));
    } catch (error) {
      console.error('Error updating comment like:', error);
    }
  };

  const handleReply = (comment: any) => {
    setReplyTo(comment);
    setNewComment(`@${comment.profiles?.display_name || comment.author?.name || 'Usuario'} `);
  };

  const renderCommentThread = ({ item }: { item: any }) => (
    !item ? null : (
    <View>
      {/* Main Comment */}
      <View style={styles.commentItem}>
        <Image 
          source={{ uri: getCommentAuthorAvatar(item) || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100' }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <Text style={styles.commentAuthor}>
            {getCommentAuthorName(item) || 'Usuario'}
          </Text>
          <Text style={styles.commentText}>{item.content}</Text>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>
              {formatDate(item.created_at)}
            </Text>
            <TouchableOpacity 
              style={styles.commentLike}
              onPress={() => handleCommentLike(item.id)}
            >
              <Heart 
                size={12} 
                color={(item.likes || []).includes(currentUser?.id) ? "#ff3040" : "#9CA3AF"} 
                fill={(item.likes || []).includes(currentUser?.id) ? "#ff3040" : "none"}
              />
              <Text style={[
                styles.commentLikeText,
                (item.likes || []).includes(currentUser?.id) && styles.commentLikedText
              ]}>
                {(item.likes || []).length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => handleReply(item)}
            >
              <Text style={styles.replyButtonText}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Replies */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply: any) => (
            <View key={reply.id} style={[styles.commentItem, styles.replyItem]}>
              <Image 
                source={{ uri: getCommentAuthorAvatar(reply) || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100' }}
                style={styles.replyAvatar}
              />
              <View style={styles.commentContent}>
                <Text style={styles.commentAuthor}>
                  {getCommentAuthorName(reply) || 'Usuario'}
                </Text>
                <Text style={styles.commentText}>{reply.content}</Text>
                <View style={styles.commentActions}>
                  <Text style={styles.commentTime}>
                    {formatDate(reply.created_at)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.commentLike}
                    onPress={() => handleCommentLike(reply.id)}
                  >
                    <Heart 
                      size={12} 
                      color={(reply.likes || []).includes(currentUser?.id) ? "#ff3040" : "#9CA3AF"} 
                      fill={(reply.likes || []).includes(currentUser?.id) ? "#ff3040" : "none"}
                    />
                    <Text style={[
                      styles.commentLikeText,
                      (reply.likes || []).includes(currentUser?.id) && styles.commentLikedText
                    ]}>
                      {(reply.likes || []).length}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
    )
  );
  const handleSharePost = async () => {
    try {
      // Prepare content to share
      const shareMessage = `¡Mira esta publicación de ${post.author?.name} en DogCatiFy!`;
      
      // Simple share implementation
      if (Platform.OS === 'web') {
        // For web, copy to clipboard or show alert
        Alert.alert('Compartir', shareMessage);
      } else {
        // For mobile, use native share
        await Share.share({
          message: shareMessage,
        });
      }
      
      // Call the onShare callback
      onShare(post.id);
    } catch (error) {
      console.error('Error sharing post:', error);
      // Don't show error alert, just log it
      console.log('Share was cancelled or failed');
    }
  };

  const handleDoubleTap = async () => {
    if (isMock) {
      Alert.alert('Publicación de muestra', 'No puedes interactuar con las publicaciones de muestra');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }
    
    // Show heart animation
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);

    // Call the like function with doubleTap=true
    onLike(post.id, true);
  };
  
  const handleImagePress = () => {
    if (doubleTapTimer) {
      // This is a double tap
      clearTimeout(doubleTapTimer);
      setDoubleTapTimer(null);
      handleDoubleTap();
    } else {
      // This might be a single tap or the first tap of a double tap
      const timer = setTimeout(() => {
        // This was a single tap
        setDoubleTapTimer(null);
        // Do nothing on single tap
      }, 300);
      setDoubleTapTimer(timer as unknown as NodeJS.Timeout);
    }
  };

  const handleNextImage = () => {
    if (post.albumImages && post.albumImages.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === post.albumImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (post.albumImages && post.albumImages.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? post.albumImages.length - 1 : prevIndex - 1
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace un momento';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInHours < 48) return 'Ayer';
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: post.author?.avatar || 'https://via.placeholder.com/40' }}
          style={styles.authorAvatar}
        />
        <View style={styles.headerText}>
          <View style={styles.authorNameContainer}>
            <Text style={styles.authorName}>{post.author?.name || 'Usuario'}</Text>
            <FollowButton userId={post.userId} authorName={post.author?.name || 'Usuario'} compact={true} />
          </View>
          <Text style={styles.petName}>con {post.pet?.name || 'mascota'}</Text>
          <Text style={styles.timestamp}>{post.timeAgo || formatDate(post.createdAt)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MoreHorizontal size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.content && (
        <Text style={styles.content}>{post.content}</Text>
      )}

      {/* Images */}
      <View style={styles.imageContainer}>
        {/* Single Image */}
        {(!post.albumImages || post.albumImages.length === 0) && post.imageURL && (
          <TouchableOpacity activeOpacity={0.9} onPress={handleImagePress}>
            <Image source={{ uri: post.imageURL }} style={styles.singleImage} />
            {showLikeAnimation && (
              <View style={styles.likeAnimationContainer}>
                <Heart size={80} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Album Images */}
        {post.albumImages && post.albumImages.length > 0 && (
          <View style={styles.albumContainer}>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset;
                const viewSize = e.nativeEvent.layoutMeasurement;
                const pageNum = Math.floor(contentOffset.x / viewSize.width);
                setCurrentImageIndex(pageNum);
              }}
            >
              {post.albumImages.map((imageUrl: string, index: number) => (
                <TouchableOpacity 
                  key={index}
                  activeOpacity={0.9} 
                  onPress={handleImagePress} 
                  style={styles.albumImageWrapper}
                >
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.albumMainImage} 
                  />
                  {showLikeAnimation && currentImageIndex === index && (
                    <View style={styles.likeAnimationContainer}>
                      <Heart size={80} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {post.albumImages.length > 1 && (
              <View style={styles.albumPagination}>
                {post.albumImages.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.paginationDot, 
                      currentImageIndex === index && styles.paginationDotActive
                    ]} 
                  />
                ))}
              </View>
            )}
                        
            <View style={styles.albumOverlay}>
              <Text style={styles.albumCount}>{currentImageIndex + 1}/{post.albumImages.length}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onLike(post.id)}
        >
          <Heart 
            size={24} 
            color={liked ? "#ff3040" : "#666"} 
            fill={liked ? "#ff3040" : "none"}
          />
          <Text style={[styles.actionText, liked && styles.likedText]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowCommentsModal(true)}
        >
          <MessageCircle size={24} color="#666" />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleSharePost}
        >
          <Share2 size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCommentsModal(false)}>
                <ArrowLeft size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Comentarios</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>
            
            {loadingComments ? (
              <View style={styles.loadingCommentsContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingCommentsText}>Cargando comentarios...</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderCommentThread({ item })}
                ListEmptyComponent={
                  <Text style={styles.noCommentsText}>No hay comentarios aún. ¡Sé el primero en comentar!</Text>
                }
                style={styles.commentsList}
              />
            )}
            
            <View style={styles.addCommentContainer}>
              {replyTo && (
                <View style={styles.replyingToContainer}>
                  <Text style={styles.replyingToText}>
                    Respondiendo a <Text style={styles.replyingToName}>{getCommentAuthorName(replyTo)}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <Text style={styles.cancelReplyText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.commentInputContainer}>
                <Image 
                  source={{ uri: currentUser?.photoURL || 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100' }}
                  style={styles.currentUserAvatar}
                />
                <TextInput
                  style={styles.commentInput}
                  placeholder="Añade un comentario..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendButton, !newComment.trim() && styles.disabledSendButton]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send size={20} color={newComment.trim() ? "#3B82F6" : "#9CA3AF"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginBottom: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  petName: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  singleImage: {
    width: width,
    height: width,
    resizeMode: 'cover',
  },
  albumContainer: {
    position: 'relative',
    width: width,
    height: width, 
  },
  albumImageWrapper: {
    width: '100%',
    height: width,
    width: width,
  },
  albumMainImage: {
    width: width,
    height: width,
    resizeMode: 'cover',
  },
  albumPagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  albumNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumNavLeft: {
    left: 10,
  },
  albumNavRight: {
    right: 10,
  },
  albumOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  albumCount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  likeAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likedText: {
    color: '#ff3040',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalHeaderSpacer: {
    width: 24,
  },
  commentsList: {
    flex: 1,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginRight: 16,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  commentLikeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  commentLikedText: {
    color: '#ff3040',
  },
  replyButton: {
    marginRight: 16,
  },
  replyButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  addCommentContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  replyingToText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  replyingToName: {
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  cancelReplyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 12,
    padding: 8,
  },
  disabledSendButton: {
    opacity: 0.5,
  },
  loadingCommentsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingCommentsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
  noCommentsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
  repliesContainer: {
    marginLeft: 48,
    borderLeftWidth: 2,
    borderLeftColor: '#F3F4F6',
    paddingLeft: 12,
  },
  replyItem: {
    paddingLeft: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});

export default PostCard;