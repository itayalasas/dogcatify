import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageCircle, User, Calendar, Send } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseClient } from '../../lib/supabase';

export default function ChatContacts() {
  const { businessId, id, petName } = useLocalSearchParams<{ businessId: string; id: string; petName: string }>();
  const { currentUser } = useAuth();
  const [adoptionChats, setAdoptionChats] = useState<any[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!currentUser || !businessId) {
      return;
    }
    
    fetchPartnerProfile();
    fetchAdoptionChats();
  }, [currentUser, businessId]);

  useEffect(() => {
    if (!currentUser || !id) {
      return;
    }

    fetchConversation();
    fetchMessages();

    const subscription = supabaseClient
      .channel(`chat-${id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `conversation_id=eq.${id}`
        }, 
        (payload) => {
          console.log('New message received via realtime:', payload);
          if (payload.new) {
            const newMessage = {
              id: payload.new.id,
              conversation_id: payload.new.conversation_id,
              sender_id: payload.new.sender_id,
              message: payload.new.message,
              message_type: payload.new.message_type || 'text',
              is_read: payload.new.is_read || false,
              created_at: payload.new.created_at
            };
            
            setMessages(prev => {
              // Avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            scrollToBottom();
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          if (payload.new) {
            setConversation(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time chat subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time chat subscription error');
        }
      });

    return () => {
      if (subscription) {
        console.log('Unsubscribing from chat channel');
        subscription.unsubscribe();
      }
    };
  }, [currentUser, id]);

  const fetchPartnerProfile = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('partners')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (error) throw error;
      setPartnerProfile(data);
    } catch (error) {
      console.error('Error fetching partner profile:', error);
    }
  };

  const fetchAdoptionChats = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('adoption_chats')
        .select('*')
        .eq('partner_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAdoptionChats(data || []);
      
      // Set up real-time subscription for chat updates
      const subscription = supabaseClient
        .channel(`partner-chats-${businessId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'adoption_chats',
            filter: `partner_id=eq.${businessId}`
          }, 
          () => {
            fetchAdoptionChats();
          }
        )
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error fetching adoption chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('chat_conversations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
          Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
          router.replace('/auth/login');
          return;
        }
        throw error;
      }
      
      setConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
          Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
          router.replace('/auth/login');
          return;
        }
        throw error;
      }
      
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabaseClient
        .from('chat_messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .neq('sender_id', currentUser?.id);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendNotificationToOtherParticipants = async (messageText: string) => {
    try {
      if (!conversation || !currentUser) return;

      // Get conversation participants
      const { data: conversationData, error } = await supabaseClient
        .from('chat_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !conversationData) {
        console.error('Error fetching conversation for notification:', error);
        return;
      }

      // Determine who to notify (the other participant)
      let recipientId = null;
      if (conversationData.user_id && conversationData.user_id !== currentUser.id) {
        recipientId = conversationData.user_id;
      } else if (conversationData.partner_id) {
        // Get partner user_id
        const { data: partnerData } = await supabaseClient
          .from('partners')
          .select('user_id')
          .eq('id', conversationData.partner_id)
          .single();
        
        if (partnerData?.user_id && partnerData.user_id !== currentUser.id) {
          recipientId = partnerData.user_id;
        }
      }

      if (!recipientId) {
        console.log('No recipient found for notification');
        return;
      }

      // Get recipient's push token
      const { data: recipientProfile } = await supabaseClient
        .from('profiles')
        .select('push_token, display_name')
        .eq('id', recipientId)
        .single();

      if (!recipientProfile?.push_token) {
        console.log('Recipient does not have push token');
        return;
      }

      // Get pet name for notification
      let petNameForNotification = petName;
      if (!petNameForNotification && conversation.adoption_pet_id) {
        const { data: petData } = await supabaseClient
          .from('adoption_pets')
          .select('name')
          .eq('id', conversation.adoption_pet_id)
          .single();
        
        if (petData?.name) {
          petNameForNotification = petData.name;
        }
      }

      // Send push notification
      const notificationPayload = {
        to: recipientProfile.push_token,
        title: `Nuevo mensaje sobre adopción de ${petNameForNotification}`,
        body: `${currentUser.displayName || 'Usuario'}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`,
        data: {
          type: 'adoption_chat',
          conversationId: id,
          petName: petNameForNotification,
          senderId: currentUser.id,
          senderName: currentUser.displayName || 'Usuario'
        },
        sound: 'default',
        priority: 'high',
      };

      console.log('Sending push notification:', notificationPayload);

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });

      const result = await response.json();
      console.log('Push notification result:', result);

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      conversation_id: id,
      sender_id: currentUser.id,
      message: newMessage.trim(),
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Add message optimistically to UI
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage.trim();
    setNewMessage('');
    scrollToBottom();
    
    try {
      const messageData = {
        conversation_id: id,
        sender_id: currentUser.id,
        message: messageToSend,
        message_type: 'text',
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT expired')) {
          Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
          router.replace('/auth/login');
          return;
        }
        
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setNewMessage(messageToSend); // Restore message
        throw error;
      }

      // Replace temp message with real message
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? {
            ...data,
            id: data.id,
            conversation_id: data.conversation_id,
            sender_id: data.sender_id,
            message: data.message,
            message_type: data.message_type || 'text',
            is_read: data.is_read || false,
            created_at: data.created_at
          } : msg
        ));
      }

      // Send push notification to other participants
      try {
        await sendNotificationToOtherParticipants(messageToSend);
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the message sending if notification fails
      }

      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleChatPress = (chat: any) => {
    router.push({
      pathname: '/chat/adoption',
      params: {
        petId: chat.pet_id,
        petName: chat.pet_name,
        partnerId: chat.partner_id,
        partnerName: chat.partner_name
      }
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace un momento';
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return date.toLocaleDateString();
  };

  const renderMessage = (message: any) => {
    const isOwnMessage = message.sender_id === currentUser?.id;
    
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}
      >
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.message}
        </Text>
        <Text style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Contactos de Adopción</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando conversaciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {petName ? `Adopción de ${petName}` : 'Chat'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Inicia la conversación sobre la adopción de {petName}
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Send size={20} color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Contactos de Adopción</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {adoptionChats.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MessageCircle size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No hay conversaciones</Text>
            <Text style={styles.emptySubtitle}>
              Las conversaciones sobre adopción aparecerán aquí cuando los usuarios se interesen en tus mascotas
            </Text>
          </Card>
        ) : (
          adoptionChats.map((chat) => (
            <Card key={chat.id} style={styles.chatCard}>
              <TouchableOpacity 
                style={styles.chatContent}
                onPress={() => handleChatPress(chat)}
              >
                <View style={styles.chatHeader}>
                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>🐾 {chat.pet_name}</Text>
                    <Text style={styles.customerName}>con {chat.customer_name}</Text>
                  </View>
                  <View style={styles.chatMeta}>
                    <Text style={styles.chatTime}>
                      {formatTime(chat.created_at)}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: chat.status === 'active' ? '#D1FAE5' : '#FEE2E2' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: chat.status === 'active' ? '#065F46' : '#991B1B' }
                      ]}>
                        {chat.status === 'active' ? 'Activo' : 'Cerrado'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.chatPreview}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.previewText}>
                    Interesado en adoptar a {chat.pet_name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}
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
    paddingHorizontal: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatCard: {
    marginVertical: 8,
  },
  chatContent: {
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#EF4444',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
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
});