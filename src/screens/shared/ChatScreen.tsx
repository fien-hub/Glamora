import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../../utils/icons';
import { useRoute, useNavigation } from '@react-navigation/native';
let ImageViewing: any = View;
try { ImageViewing = require('react-native-image-viewing').default; } catch (e) { console.warn('[ChatScreen] react-native-image-viewing unavailable:', e); }
let FileSystem: typeof import('expo-file-system') = {} as any;
try { FileSystem = require('expo-file-system'); } catch (e) { console.warn('[ChatScreen] expo-file-system unavailable:', e); }
let Sharing: typeof import('expo-sharing') = {} as any;
try { Sharing = require('expo-sharing'); } catch (e) { console.warn('[ChatScreen] expo-sharing unavailable:', e); }
let MediaLibrary: typeof import('expo-media-library') = {} as any;
try { MediaLibrary = require('expo-media-library'); } catch (e) { console.warn('[ChatScreen] expo-media-library unavailable:', e); }
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { pickImage, uploadChatImage } from '../../utils/imageUpload';
let ImagePicker: typeof import('expo-image-picker') = {} as any;
try { ImagePicker = require('expo-image-picker'); } catch (e) { console.warn('[ChatScreen] expo-image-picker unavailable:', e); }
import { useVerificationGuard } from '../../hooks/useVerificationGuard';

interface Message {
  id: string;
  booking_id: string | null;
  sender_id: string;
  receiver_id: string;
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface RouteParams {
  bookingId?: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  isSupportChat?: boolean;
}

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { bookingId, otherUserId, otherUserName, otherUserAvatar, isSupportChat = false } = route.params as RouteParams;
  const conversationBookingId = isSupportChat ? null : bookingId ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [otherUserAuthId, setOtherUserAuthId] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [viewerActionLoading, setViewerActionLoading] = useState<'save' | 'share' | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verification guard
  const { requireVerification } = useVerificationGuard();

  useEffect(() => {
    // Check verification before allowing messaging
    if (!requireVerification('messaging')) {
      navigation.goBack();
      return;
    }

    if (user) {
      initializeChat();
    }
  }, [user, bookingId, isSupportChat]);

  useEffect(() => {
    // Filter messages based on search query
    if (searchQuery.trim()) {
      const filtered = messages.filter((msg) =>
        msg.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchQuery, messages]);

  const initializeChat = async () => {
    if (!user) return;

    try {
      // Use the auth user ID directly (messages table uses auth user IDs, not profile IDs)
      setCurrentUserId(user.id);

      // Convert otherUserId (profile ID) to auth user ID
      // The otherUserId passed in might be a profile.id, we need auth.users.id
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', otherUserId)
        .single();

      if (otherProfile?.user_id) {
        setOtherUserAuthId(otherProfile.user_id);
        console.log('[Chat] Other user auth ID:', otherProfile.user_id);
      } else {
        // If not found as profile ID, assume it's already an auth user ID
        setOtherUserAuthId(otherUserId);
        console.log('[Chat] Using otherUserId as auth ID:', otherUserId);
      }

      // Fetch messages
      await fetchMessages(user.id);

      // Mark messages as read
      await markMessagesAsRead(user.id);

      // Subscribe to new messages
      subscribeToMessages(user.id);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (profileId: string) => {
    try {
      const supportAuthUserId = otherUserAuthId || otherUserId;
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (conversationBookingId) {
        query = query
          .eq('booking_id', conversationBookingId)
          .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`);
      } else {
        query = query
          .is('booking_id', null)
          .or(`and(sender_id.eq.${profileId},receiver_id.eq.${supportAuthUserId}),and(sender_id.eq.${supportAuthUserId},receiver_id.eq.${profileId})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages(data || []);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (profileId: string) => {
    try {
      const supportAuthUserId = otherUserAuthId || otherUserId;
      let query = supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', profileId)
        .eq('is_read', false);

      if (conversationBookingId) {
        query = query.eq('booking_id', conversationBookingId);
      } else {
        query = query
          .eq('sender_id', supportAuthUserId)
          .is('booking_id', null);
      }

      await query;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = (profileId: string) => {
    const supportAuthUserId = otherUserAuthId || otherUserId;

    const handleIncomingMessage = (newMsg: Message) => {
      if (conversationBookingId) {
        if (newMsg.booking_id !== conversationBookingId) return;
        if (newMsg.sender_id !== profileId && newMsg.receiver_id !== profileId) return;
      } else {
        const isSupportThread =
          newMsg.booking_id === null &&
          ((newMsg.sender_id === profileId && newMsg.receiver_id === supportAuthUserId) ||
            (newMsg.sender_id === supportAuthUserId && newMsg.receiver_id === profileId));

        if (!isSupportThread) return;
      }

      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === newMsg.id);
        if (exists) return prev;

        const tempIndex = prev.findIndex((msg) =>
          msg.id.startsWith('temp-') &&
          msg.sender_id === newMsg.sender_id &&
          msg.message === newMsg.message
        );

        if (tempIndex !== -1) {
          const newMessages = [...prev];
          newMessages[tempIndex] = newMsg;
          return newMessages;
        }

        return [...prev, newMsg];
      });

      if (newMsg.receiver_id === profileId) {
        markMessagesAsRead(profileId);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const subscription = supabase
      .channel(`messages:${conversationBookingId || `support-${profileId}-${supportAuthUserId}`}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          handleIncomingMessage(payload.new as Message);
        }
      );

    if (conversationBookingId) {
      subscription.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'typing_indicators',
          filter: `booking_id=eq.${conversationBookingId}`,
        },
        (payload) => {
          const indicator = payload.new as any;
          if (indicator.user_id !== profileId) {
            setOtherUserTyping(indicator.is_typing);
          }
        }
      );
    }

    subscription.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const updateTypingIndicator = async (isTyping: boolean) => {
    if (!currentUserId || !conversationBookingId) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          booking_id: conversationBookingId,
          user_id: currentUserId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  };

  const handleSendMessage = async (imageUrl?: string) => {
    if ((!newMessage.trim() && !imageUrl) || !currentUserId || sending) return;

    // Use converted auth ID for receiver, fall back to passed ID
    const receiverId = otherUserAuthId || otherUserId;
    const messageText = newMessage.trim() || (imageUrl ? '📷 Image' : '');

    // Clear input immediately for better UX
    setNewMessage('');

    // Create optimistic message (show immediately before DB confirms)
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      booking_id: conversationBookingId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      message: messageText,
      image_url: imageUrl || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    // Add to messages immediately (optimistic update)
    setMessages((prev) => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      setSending(true);

      console.log('[Chat] Sending message - sender:', currentUserId, 'receiver:', receiverId);

      const { data, error } = await supabase.from('messages').insert({
        booking_id: conversationBookingId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message: messageText,
        image_url: imageUrl || null,
        is_read: false,
      }).select().single();

      if (error) throw error;

      // Replace optimistic message with real one (prevents duplicates from subscription)
      if (data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? data : msg
          )
        );

        // Trigger remote push notification (non-blocking)
        supabase.functions
          .invoke('send-message-notification', {
            body: {
              message_id: data.id,
              booking_id: conversationBookingId,
              sender_id: currentUserId,
              receiver_id: receiverId,
              message: messageText,
              image_url: imageUrl || null,
            },
          })
          .catch((pushError) => {
            console.error('[Chat] Failed to invoke message push function:', pushError);
          });
      }

      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore the message text so user can retry
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!user || !currentUserId) return;

    try {
      setUploadingImage(true);

      // Pick image
      const imageUri = await pickImage({ allowsEditing: true, aspect: [4, 3] });

      if (!imageUri) {
        setUploadingImage(false);
        return;
      }

      // Upload to storage
      const result = await uploadChatImage(imageUri, user.id);

      if (!result.success || !result.url) {
        Alert.alert('Upload Failed', result.error || 'Failed to upload image');
        setUploadingImage(false);
        return;
      }

      // Send message with image
      await handleSendMessage(result.url);
    } catch (error) {
      console.error('Error picking/uploading image:', error);
      Alert.alert('Error', 'Failed to share image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!user || !currentUserId) return;

    try {
      setUploadingImage(true);

      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        setUploadingImage(false);
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        setUploadingImage(false);
        return;
      }

      // Upload to storage
      const uploadResult = await uploadChatImage(result.assets[0].uri, user.id);

      if (!uploadResult.success || !uploadResult.url) {
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
        setUploadingImage(false);
        return;
      }

      // Send message with image
      await handleSendMessage(uploadResult.url);
    } catch (error) {
      console.error('Error taking/uploading photo:', error);
      Alert.alert('Error', 'Failed to share photo. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handlePickImage();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handlePickImage },
        ]
      );
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);

    // Update typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      updateTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingIndicator(false);
    }, 2000);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, index: number) => {
    if (index === 0) return true;
    const displayMessages = searchQuery.trim() ? filteredMessages : messages;
    const prevMsg = displayMessages[index - 1];
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, message: 'Message deleted' } : msg
        )
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      // Toggle reaction (add or remove)
      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error reacting to message:', error);
    }
  };

  const showMessageOptions = (message: Message) => {
    const isMyMessage = message.sender_id === currentUserId;

    const options = [
      'Cancel',
      '❤️ React',
      '👍 React',
      '😂 React',
      ...(isMyMessage ? ['Delete Message'] : []),
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: isMyMessage ? options.length - 1 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleReactToMessage(message.id, '❤️');
          else if (buttonIndex === 2) handleReactToMessage(message.id, '👍');
          else if (buttonIndex === 3) handleReactToMessage(message.id, '😂');
          else if (isMyMessage && buttonIndex === 4) {
            Alert.alert(
              'Delete Message',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(message.id) },
              ]
            );
          }
        }
      );
    } else {
      const androidOptions: Array<{ text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }> = [
        { text: 'Cancel', style: 'cancel' as const },
        { text: '❤️ React', onPress: () => { handleReactToMessage(message.id, '❤️'); } },
        { text: '👍 React', onPress: () => { handleReactToMessage(message.id, '👍'); } },
        { text: '😂 React', onPress: () => { handleReactToMessage(message.id, '😂'); } },
      ];

      if (isMyMessage) {
        androidOptions.push({
          text: 'Delete Message',
          onPress: () => {
            Alert.alert(
              'Delete Message',
              'Are you sure you want to delete this message?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(message.id) },
              ]
            );
          },
        });
      }

      Alert.alert('Message Options', '', androidOptions);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const showDate = shouldShowDateSeparator(item, index);
    const isSending = item.id.startsWith('temp-');

    return (
      <>
        {/* Date Separator */}
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDateSeparator(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}

        {/* Message Row */}
        <View style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.theirMessageRow,
        ]}>
          {/* Avatar for other user's messages */}
          {!isMyMessage && (
            <Image
              source={otherUserAvatar ? { uri: otherUserAvatar } : require('../../../assets/icon.png')}
              style={styles.messageAvatar}
            />
          )}

          <TouchableOpacity
            style={[
              styles.messageContainer,
              isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
            ]}
            onLongPress={() => showMessageOptions(item)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
              ]}
            >
              {item.image_url && (
                <TouchableOpacity
                  onPress={() => {
                    if (!item.image_url) return;
                    setViewerImageUrl(item.image_url);
                    setViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: item.image_url }} style={styles.messageImage} />
                </TouchableOpacity>
              )}
              {item.message && item.message !== '📷 Image' && (
                <Text
                  style={[
                    styles.messageText,
                    isMyMessage ? styles.myMessageText : styles.theirMessageText,
                  ]}
                >
                  {item.message}
                </Text>
              )}
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
                  ]}
                >
                  {formatMessageTime(item.created_at)}
                </Text>
                {/* Status indicator for sent messages */}
                {isMyMessage && (
                  <View style={styles.statusIndicator}>
                    {isSending ? (
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
                    ) : item.is_read ? (
                      <View style={styles.doubleCheck}>
                        <Ionicons name="checkmark" size={12} color="#4FC3F7" />
                        <Ionicons name="checkmark" size={12} color="#4FC3F7" style={styles.secondCheck} />
                      </View>
                    ) : (
                      <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.7)" />
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const closeImageViewer = () => {
    setViewerVisible(false);
    setViewerImageUrl(null);
    setViewerActionLoading(null);
  };

  const downloadViewerImage = async (): Promise<string> => {
    if (!viewerImageUrl) throw new Error('No image available');

    const extension = viewerImageUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const baseDirectory =
      (FileSystem as any).cacheDirectory ||
      (FileSystem as any).documentDirectory;

    if (!baseDirectory) {
      throw new Error('No writable storage directory available on this device');
    }

    const destination = `${baseDirectory}chat-image-${Date.now()}.${extension}`;
    const download = await FileSystem.downloadAsync(viewerImageUrl, destination);
    return download.uri;
  };

  const handleShareViewerImage = async () => {
    if (!viewerImageUrl || viewerActionLoading) return;

    setViewerActionLoading('share');
    try {
      const localImageUri = await downloadViewerImage();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localImageUri);
      } else {
        await Share.share({
          message: viewerImageUrl,
          url: viewerImageUrl,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to share image');
    } finally {
      setViewerActionLoading(null);
    }
  };

  const handleSaveViewerImage = async () => {
    if (!viewerImageUrl || viewerActionLoading) return;

    setViewerActionLoading('save');
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to save images.');
        return;
      }

      const localImageUri = await downloadViewerImage();
      await MediaLibrary.saveToLibraryAsync(localImageUri);
      Alert.alert('Saved', 'Image saved to your photo library.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save image');
    } finally {
      setViewerActionLoading(null);
    }
  };

  const ViewerHeader = ({ imageIndex }: { imageIndex: number }) => (
    <View style={styles.viewerHeader}>
      <TouchableOpacity style={styles.viewerHeaderButton} onPress={closeImageViewer}>
        <Ionicons name="close" size={26} color={colors.white} />
      </TouchableOpacity>

      <View style={styles.viewerHeaderActions}>
        <TouchableOpacity
          style={[styles.viewerHeaderButton, viewerActionLoading === 'save' && styles.viewerHeaderButtonDisabled]}
          onPress={handleSaveViewerImage}
          disabled={viewerActionLoading !== null}
        >
          {viewerActionLoading === 'save' ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="download-outline" size={22} color={colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewerHeaderButton, viewerActionLoading === 'share' && styles.viewerHeaderButtonDisabled]}
          onPress={handleShareViewerImage}
          disabled={viewerActionLoading !== null}
        >
          {viewerActionLoading === 'share' ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="share-social-outline" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        {!showSearch ? (
          <>
            <Image
              source={otherUserAvatar ? { uri: otherUserAvatar } : require('../../../assets/icon.png')}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerName}>{otherUserName}</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={24} color={colors.text} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={searchQuery.trim() ? filteredMessages : messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No messages found</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>Start the conversation</Text>
              <Text style={styles.emptyStateText}>
                Say hello to {otherUserName}! 👋
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          otherUserTyping && !searchQuery.trim() ? (
            <View style={styles.typingIndicator}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>●●●</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleImageOptions} style={styles.imageButton} disabled={uploadingImage}>
          {uploadingImage ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={() => handleSendMessage()}
          style={[styles.sendButton, (!newMessage.trim() || sending || uploadingImage) && styles.sendButtonDisabled]}
          disabled={!newMessage.trim() || sending || uploadingImage}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ImageViewing
        images={viewerImageUrl ? [{ uri: viewerImageUrl }] : []}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={closeImageViewer}
        swipeToCloseEnabled
        HeaderComponent={ViewerHeader}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  headerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    fontWeight: fontWeight.medium,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
    marginBottom: 2,
  },
  messageContainer: {
    maxWidth: '75%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  myMessageBubble: {
    backgroundColor: colors.primary,
  },
  theirMessageBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.white,
  },
  theirMessageText: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: fontSize.xs,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: colors.textSecondary,
  },
  statusIndicator: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondCheck: {
    marginLeft: -8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  viewerHeader: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewerHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  viewerHeaderButtonDisabled: {
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  imageButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  typingIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  headerButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

