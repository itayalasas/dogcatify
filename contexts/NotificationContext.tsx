import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { supabaseClient } from '../lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPushNotifications: () => Promise<string | null>;
  sendNotificationToUser: (userId: string, title: string, body: string, data?: any) => Promise<void>;
  sendNotificationToAdmin: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { currentUser } = useAuth();

  // Auto-register push token when user is authenticated
  useEffect(() => {
    if (currentUser && !expoPushToken) {
      console.log('User authenticated, auto-registering push notifications...');
      registerForPushNotifications();
    }
  }, [currentUser]);
  useEffect(() => {
    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      console.log('Starting push notification registration...');
      
      // Check if running in Expo Go
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        console.log('Running in Expo Go - push notifications may have limitations');
        // Don't return null immediately, try to register anyway
      }
      
      // For web, skip push notifications
      if (Platform.OS === 'web') {
        console.log('Web platform - push notifications not supported');
        return null;
      }

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      console.log('Device check passed, requesting permissions...');

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Permission request result:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions not granted. Final status:', finalStatus);
        return null;
      }

      console.log('Permissions granted, getting push token...');

      // Get the push token
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_PROJECT_ID;
        console.log('Using project ID:', projectId);
        
        if (!projectId) {
          console.error('No project ID found for push notifications');
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });

        console.log('Push token obtained:', tokenData.data);

        // Configure Android notification channel
        if (Platform.OS === 'android') {
          console.log('Setting up Android notification channel...');
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // Store token in user profile if user is logged in
        if (currentUser && tokenData.data) {
          console.log('Storing push token in user profile...');
          try {
            const { error } = await supabaseClient
              .from('profiles')
              .update({ push_token: tokenData.data })
              .eq('id', currentUser.id);
            
            if (error) {
              console.error('Error storing push token:', error);
            } else {
              console.log('Push token stored successfully in profile');
            }
          } catch (dbError) {
            console.error('Database error storing push token:', dbError);
          }
        }

        setExpoPushToken(tokenData.data);
        return tokenData.data;
      } catch (tokenError) {
        console.error('Error getting push token:', tokenError);
        return null;
      }
    } catch (error) {
      console.error('Error in registerForPushNotifications:', error);
      return null;
    }
  };

  const sendNotificationToUser = async (
    userId: string, 
    title: string, 
    body: string, 
    data?: any
  ): Promise<void> => {
    try {
      console.log('Sending notification to user:', userId);
      console.log('Notification title:', title);
      console.log('Notification body:', body);
      
      // Get user's push token - fix the query to handle multiple results
      const { data: userData, error } = await supabaseClient
        .from('profiles')
        .select('push_token')
        .eq('id', userId);
      
      console.log('Push token query result:', { userData, error });

      if (error || !userData || userData.length === 0) {
        console.log('User does not have a push token or error fetching:', {
          error: error?.message,
          userDataLength: userData?.length || 0
        });
        return;
      }
      
      const userProfile = userData[0];
      if (!userProfile?.push_token) {
        console.log('User profile found but no push token:', {
          userId,
          hasProfile: !!userProfile,
          pushToken: userProfile?.push_token || 'NULL'
        });
        return;
      }

      console.log('Sending push notification to token:', userProfile.push_token);

      // Send push notification
      const notificationPayload = {
        to: userProfile.push_token,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      };
      
      console.log('Notification payload:', notificationPayload);
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });

      console.log('Push notification response status:', response.status);
      
      const result = await response.json();
      console.log('Push notification result:', result);
      
      if (!response.ok) {
        console.error('Push notification failed:', result);
        throw new Error(`Push notification failed: ${JSON.stringify(result)}`);
      }
      
      // Check for errors in the result
      if (result.data && result.data.status === 'error') {
        console.error('Push notification error in result:', result.data);
        throw new Error(`Push notification error: ${result.data.message}`);
      }
      
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error; // Re-throw to let caller handle it
    }
  };

  const sendNotificationToAdmin = async (
    title: string, 
    body: string, 
    data?: any
  ): Promise<void> => {
    try {
      console.log('Sending notification to admin');
      
      // Get admin users (you can define admin criteria)
      const { data: adminUsers, error } = await supabaseClient
        .from('profiles')
        .select('push_token')
        .eq('email', 'admin@dogcatify.com'); // Or however you identify admins

      if (error || !adminUsers?.length) {
        console.log('No admin users found or error:', error);
        return;
      }

      // Send to all admin users
      const notifications = adminUsers
        .filter(admin => admin.push_token)
        .map(admin => ({
          to: admin.push_token,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
        }));

      if (notifications.length > 0) {
        console.log('Sending notifications to', notifications.length, 'admin users');
        
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notifications),
        });

        const result = await response.json();
        console.log('Admin push notification result:', result);
      }
    } catch (error) {
      console.error('Error sending notification to admin:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerForPushNotifications,
        sendNotificationToUser,
        sendNotificationToAdmin,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};