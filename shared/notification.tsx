
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../navigator';
import { supabase } from '../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Notifications'
>;

type OrderType = 'catalog' | 'custom';

type OrderTarget = {
  orderId: string;
  orderType: OrderType;
};

type Notification = {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  order_id: string | null;
  custom_order_id: string | null;
  payment_id: string | null;
  production_tracking_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const COLORS = {
  rose: '#D96B8A',
  roseDark: '#B84470',
  blush: '#FFF1F6',
  blushDeep: '#FCE0EC',
  ink: '#2B1B24',
  muted: '#7C6B74',
  line: '#F1E3EA',
  bg: '#FFFAFC',
  white: '#FFFFFF',
};

export default function NotificationsScreen({ navigation }: Props) {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          recipient_id,
          title,
          message,
          type,
          order_id,
          custom_order_id,
          payment_id,
          production_tracking_id,
          is_read,
          read_at,
          created_at
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications((data ?? []) as Notification[]);
    } catch (error) {
      console.error('Notification loading error:', error);
      Alert.alert(
        'Unable to load notifications',
        'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications();
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: readAt,
      })
      .eq('id', notification.id);

    if (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, read_at: readAt }
          : item
      )
    );
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return;

      const readAt = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: readAt,
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.is_read ? item.read_at : readAt,
        }))
      );
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      Alert.alert(
        'Unable to update notifications',
        'Please try again.'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    const difference = Date.now() - date.getTime();

    const minutes = Math.floor(difference / (1000 * 60));

    if (minutes < 1) return 'Just now';

    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Resolve the order directly from the notification first.
  // If the notification only has a payment or production reference,
  // retrieve the related order from Supabase.
  const resolveOrderTarget = async (
    notification: Notification
  ): Promise<OrderTarget | null> => {
    if (notification.custom_order_id) {
      return {
        orderId: notification.custom_order_id,
        orderType: 'custom',
      };
    }

    if (notification.order_id) {
      return {
        orderId: notification.order_id,
        orderType: 'catalog',
      };
    }

    // Payment notifications may contain only payment_id.
    if (notification.payment_id) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('order_id, custom_order_id')
        .eq('id', notification.payment_id)
        .maybeSingle();

      if (error) throw error;

      if (payment?.custom_order_id) {
        return {
          orderId: payment.custom_order_id,
          orderType: 'custom',
        };
      }

      if (payment?.order_id) {
        return {
          orderId: payment.order_id,
          orderType: 'catalog',
        };
      }
    }

    // Production notifications may contain only production_tracking_id.
    if (notification.production_tracking_id) {
      const { data: production, error } = await supabase
        .from('production_tracking')
        .select('order_id, custom_order_id')
        .eq('id', notification.production_tracking_id)
        .maybeSingle();

      if (error) throw error;

      if (production?.custom_order_id) {
        return {
          orderId: production.custom_order_id,
          orderType: 'custom',
        };
      }

      if (production?.order_id) {
        return {
          orderId: production.order_id,
          orderType: 'catalog',
        };
      }
    }

    return null;
  };

  const openNotification = async (notification: Notification) => {
    if (openingId) return;

    setOpeningId(notification.id);

    try {
      // Mark the notification as read before navigating.
      await markAsRead(notification);

      const target = await resolveOrderTarget(notification);

      // Notifications without an associated order are simply marked read.
      if (!target) {
        return;
      }

      // Determine whether the logged-in user is staff or customer.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error('Please log in again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = String(profile?.role ?? '').toLowerCase();

      if (role === 'staff') {
        navigation.navigate('ManageOrder', target);
      } else if (role === 'customer') {
        navigation.navigate('OrderDetails', target);
      } else {
        throw new Error(
          'Unable to determine your account role. Please try again.'
        );
      }
    } catch (error: any) {
      console.error('Open notification error:', error);

      Alert.alert(
        'Unable to Open Notification',
        error?.message ??
          'The related order could not be opened. Please try again.'
      );
    } finally {
      setOpeningId(null);
    }
  };

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>

          {unreadCount > 0 && (
            <Text style={styles.headerUnread}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={markAllAsRead}
          disabled={unreadCount === 0 || markingAll}
          activeOpacity={0.7}
          style={styles.readAllButton}
        >
          {markingAll ? (
            <ActivityIndicator
              size="small"
              color={COLORS.rose}
            />
          ) : (
            <Text
              style={[
                styles.markAll,
                unreadCount === 0 && styles.markAllDisabled,
              ]}
            >
              Read all
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.rose}
          />

          <Text style={styles.loadingText}>
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            No notifications yet
          </Text>

          <Text style={styles.emptyText}>
            We'll let you know when there is an update
            about your orders.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.rose}
            />
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent Activity
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your latest order and payment updates
            </Text>
          </View>

          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              activeOpacity={0.8}
              style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard,
                openingId === notification.id && styles.openingCard,
              ]}
              onPress={() => openNotification(notification)}
              disabled={openingId !== null}
            >
              <View style={styles.notificationContent}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.unreadTitle,
                    ]}
                  >
                    {notification.title}
                  </Text>

                  {!notification.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                <View style={styles.cardBottom}>
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </Text>

                  {!notification.is_read && (
                    <Text style={styles.unreadLabel}>
                      UNREAD
                    </Text>
                  )}
                </View>

                {openingId === notification.id && (
                  <View style={styles.openingIndicator}>
                    <ActivityIndicator
                      size="small"
                      color={COLORS.rose}
                    />

                    <Text style={styles.openingText}>
                      Opening...
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
  },

  headerUnread: {
    color: COLORS.rose,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  readAllButton: {
    paddingVertical: 9,
    paddingLeft: 8,
    minWidth: 55,
    alignItems: 'center',
  },

  markAll: {
    color: COLORS.rose,
    fontSize: 12,
    fontWeight: '700',
  },

  markAllDisabled: {
    color: '#C9BEC4',
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 35,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  notificationCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
  },

  unreadCard: {
    backgroundColor: COLORS.blush,
    borderColor: COLORS.blushDeep,
  },

  openingCard: {
    opacity: 0.7,
  },

  notificationContent: {
    flex: 1,
    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  notificationTitle: {
    flex: 1,
    flexShrink: 1,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  unreadTitle: {
    fontWeight: '800',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.rose,
    marginLeft: 9,
    marginTop: 6,
  },

  notificationMessage: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    flexShrink: 1,
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },

  notificationTime: {
    color: '#AA9BA3',
    fontSize: 11,
  },

  unreadLabel: {
    color: COLORS.roseDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  openingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 7,
  },

  openingText: {
    color: COLORS.rose,
    fontSize: 11,
    fontWeight: '600',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
  },

  emptyTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
