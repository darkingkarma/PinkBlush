import { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useNavigation,
  NavigationProp,
} from '@react-navigation/native';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type {
  StaffTabParamList,
  RootStackParamList,
} from '../../navigator';

import { supabase } from '../../supabase';

type Props = BottomTabScreenProps<StaffTabParamList, 'Dashboard'>;

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  inProduction: number;
  readyForPickup: number;
};

type RecentOrder = {
  id: string;
  status: string;
  created_at: string;
  orderType: 'Catalog' | 'Custom';
};

type RecentPayment = {
  id: string;
  payment_type: string | null;
  status: string | null;
  created_at: string;
};

const initialStats: DashboardStats = {
  totalOrders: 0,
  pendingOrders: 0,
  inProduction: 0,
  readyForPickup: 0,
};

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

export default function StaffDashboard({ navigation }: Props) {
  const rootNavigation =
    useNavigation<NavigationProp<RootStackParamList>>();

  const { width } = useWindowDimensions();

  const isSmallScreen = width < 380;
  const isLargeScreen = width >= 700;

  const [stats, setStats] = useState<DashboardStats>(initialStats);

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const hasLoadedRef = useRef(false);
  const isFocusedRef = useRef(false);
  const requestInProgressRef = useRef(false);

  // LOAD DASHBOARD DATA
  const loadDashboard = useCallback(async () => {
    if (requestInProgressRef.current) return;

    requestInProgressRef.current = true;

    const showInitialLoading = !hasLoadedRef.current;

    if (showInitialLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setErrorMessage('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!isFocusedRef.current) return;

      if (!user) {
        setStats(initialStats);
        setRecentOrders([]);
        setRecentPayments([]);
        setHasUnreadNotifications(false);
        return;
      }

      const [
        catalogResult,
        customResult,
        catalogRecentResult,
        customRecentResult,
        paymentsResult,
        unreadNotificationsResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('status'),

        supabase
          .from('custom_orders')
          .select('status'),

        supabase
          .from('orders')
          .select('id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('custom_orders')
          .select('id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('payments')
          .select('id, payment_type, status, created_at')
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (customResult.error) throw customResult.error;
      if (catalogRecentResult.error) throw catalogRecentResult.error;
      if (customRecentResult.error) throw customRecentResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      if (unreadNotificationsResult.error) {
        throw unreadNotificationsResult.error;
      }

      if (!isFocusedRef.current) return;

      setHasUnreadNotifications(
        (unreadNotificationsResult.count ?? 0) > 0
      );

      // COMBINE CATALOG AND CUSTOM ORDER STATUSES
      const catalogOrders = catalogResult.data ?? [];
      const customOrders = customResult.data ?? [];

      const allStatuses = [
        ...catalogOrders.map(order => normalizeStatus(order.status)),
        ...customOrders.map(order => normalizeStatus(order.status)),
      ];

      // ORDERS WAITING FOR STAFF ACTION
      const pendingStatuses = [
        'pending',
        'submitted',
        'under_review',
        'quoted',
        'quotation_sent',
        'accepted',
        'measurements_pending',
        'awaiting_deposit',
        'deposit_paid',
      ];

      // ORDERS CURRENTLY IN THE PRODUCTION WORKFLOW
      const productionStatuses = [
        'assigned',
        'in_production',
        'cutting',
        'sewing',
        'fitting',
        'finishing',
      ];

      // ORDERS READY FOR CUSTOMER PICKUP OR RELEASE
      const readyStatuses = [
        'ready_for_release',
        'ready_for_pickup',
      ];

      setStats({
        totalOrders: allStatuses.length,

        pendingOrders: allStatuses.filter(status =>
          pendingStatuses.includes(status)
        ).length,

        inProduction: allStatuses.filter(status =>
          productionStatuses.includes(status)
        ).length,

        readyForPickup: allStatuses.filter(status =>
          readyStatuses.includes(status)
        ).length,
      });

      // RECENT CATALOG ORDERS
      const catalogRecent: RecentOrder[] = (
        catalogRecentResult.data ?? []
      ).map(order => ({
        id: order.id,
        status: order.status ?? 'Pending',
        created_at: order.created_at,
        orderType: 'Catalog',
      }));

      // RECENT CUSTOM ORDERS
      const customRecent: RecentOrder[] = (
        customRecentResult.data ?? []
      ).map(order => ({
        id: order.id,
        status: order.status ?? 'Submitted',
        created_at: order.created_at,
        orderType: 'Custom',
      }));

      // COMBINE AND SORT RECENT ORDERS
      const combinedOrders = [
        ...catalogRecent,
        ...customRecent,
      ]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
        .slice(0, 3);

      setRecentOrders(combinedOrders);
      setRecentPayments(paymentsResult.data ?? []);

    } catch (error) {
      console.error('Error loading dashboard:', error);

      if (isFocusedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load dashboard information. Please try again.'
        );
      }
    } finally {
      requestInProgressRef.current = false;

      if (isFocusedRef.current) {
        setLoading(false);
        setRefreshing(false);
        hasLoadedRef.current = true;
      }
    }
  }, []);

  // RELOAD WHEN DASHBOARD RECEIVES FOCUS
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      void loadDashboard();

      return () => {
        isFocusedRef.current = false;
      };
    }, [loadDashboard])
  );

  // NAVIGATION
  const handleNotifications = () => {
    rootNavigation.navigate('Notifications');
  };

  const handleReports = () => {
    rootNavigation.navigate('ReportsManagement');
  };

  const handleManageGarments = () => {
    navigation.navigate('Garments');
  };

  const handleManageOrders = () => {
    navigation.navigate('ManageOrders');
  };

  const handlePayments = () => {
    navigation.navigate('Payments');
  };

  // FORMATTING
  const formatDate = (date: string) => {
    if (!date) return 'Date unavailable';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const shortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  // PAYMENT STATUS COLORS
  const getPaymentStatusStyle = (status: string | null) => {
    const normalized = normalizeStatus(status);

    if (normalized === 'paid' || normalized === 'succeeded') {
      return {
        container: styles.paidStatus,
        text: styles.paidText,
      };
    }

    if (
      normalized === 'failed' ||
      normalized === 'cancelled' ||
      normalized === 'canceled'
    ) {
      return {
        container: styles.failedStatus,
        text: styles.failedText,
      };
    }

    if (normalized === 'refunded') {
      return {
        container: styles.refundedStatus,
        text: styles.refundedText,
      };
    }

    return {
      container: styles.pendingStatus,
      text: styles.pendingText,
    };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isLargeScreen && styles.contentWide,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadDashboard()}
          tintColor="#D96B8A"
          colors={['#D96B8A']}
        />
      }
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Staff Dashboard</Text>

          <Text style={styles.subtitle}>
            Welcome to Pink Blush Staff Management
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotifications}
          activeOpacity={0.8}
          accessibilityLabel="Open notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color="#D96B8A"
          />

          {hasUnreadNotifications && (
            <View style={styles.notificationDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* WELCOME */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>
          Welcome Back!
        </Text>

        <Text style={styles.welcomeDescription}>
          Here's an overview of your orders, payments, and production
          activities.
        </Text>
      </View>

      {/* ORDER OVERVIEW */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Order Overview
        </Text>

        <TouchableOpacity
          onPress={() => void loadDashboard()}
          disabled={loading || refreshing}
          activeOpacity={0.7}
          style={styles.refreshButton}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color="#D96B8A"
          />
        </TouchableOpacity>
      </View>

      {/* ERROR MESSAGE */}
      {!!errorMessage && !loading && (
        <View style={styles.errorCard}>
          <View style={styles.errorContent}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#C94C4C"
            />

            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>
                Unable to Load Dashboard
              </Text>

              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadDashboard()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STATISTICS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color="#D96B8A"
          />

          <Text style={styles.loadingText}>
            Loading dashboard...
          </Text>
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <View
            style={[
              styles.statCard,
              isLargeScreen && styles.statCardWide,
            ]}
          >
            <View style={styles.statIcon}>
              <Ionicons
                name="receipt-outline"
                size={20}
                color="#D96B8A"
              />
            </View>

            <Text style={styles.statNumber}>
              {stats.totalOrders}
            </Text>

            <Text style={styles.statLabel}>
              Total Orders
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              isLargeScreen && styles.statCardWide,
            ]}
          >
            <View style={styles.statIcon}>
              <Ionicons
                name="time-outline"
                size={20}
                color="#D99A3D"
              />
            </View>

            <Text style={styles.statNumber}>
              {stats.pendingOrders}
            </Text>

            <Text style={styles.statLabel}>
              Pending Orders
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              isLargeScreen && styles.statCardWide,
            ]}
          >
            <View style={styles.statIcon}>
              <Ionicons
                name="cut-outline"
                size={20}
                color="#6486C7"
              />
            </View>

            <Text style={styles.statNumber}>
              {stats.inProduction}
            </Text>

            <Text style={styles.statLabel}>
              In Production
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              isLargeScreen && styles.statCardWide,
            ]}
          >
            <View style={styles.statIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#28A745"
              />
            </View>

            <Text style={styles.statNumber}>
              {stats.readyForPickup}
            </Text>

            <Text style={styles.statLabel}>
              Ready for Pickup
            </Text>
          </View>
        </View>
      )}

      {/* QUICK ACCESS */}
      <Text style={styles.sectionTitle}>
        Quick Access
      </Text>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handleReports}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons
            name="bar-chart-outline"
            size={22}
            color="#D96B8A"
          />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>
            Reports Management
          </Text>

          <Text style={styles.buttonDescription}>
            View production, payment, and material reports
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#D96B8A"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handlePayments}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons
            name="wallet-outline"
            size={22}
            color="#D96B8A"
          />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>
            Manage Payments
          </Text>

          <Text style={styles.buttonDescription}>
            Review customer deposits, balances, and payments
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#D96B8A"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handleManageGarments}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons
            name="shirt-outline"
            size={22}
            color="#D96B8A"
          />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>
            Manage Garments
          </Text>

          <Text style={styles.buttonDescription}>
            Manage garment categories, designs, and fabrics
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#D96B8A"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handleManageOrders}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons
            name="document-text-outline"
            size={22}
            color="#D96B8A"
          />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>
            Manage Orders
          </Text>

          <Text style={styles.buttonDescription}>
            Review catalog orders, custom requests, and assignments
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#D96B8A"
        />
      </TouchableOpacity>

      {/* RECENT ORDERS */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent Orders
          </Text>

          <TouchableOpacity
            onPress={handleManageOrders}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#D96B8A" />
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="file-tray-outline"
              size={27}
              color="#C59BA9"
            />

            <Text style={styles.emptyText}>
              No recent orders found.
            </Text>
          </View>
        ) : (
          recentOrders.map(order => (
            <View
              key={`${order.orderType}-${order.id}`}
              style={styles.activityCard}
            >
              <View style={styles.activityIcon}>
                <Ionicons
                  name={
                    order.orderType === 'Catalog'
                      ? 'shirt-outline'
                      : 'create-outline'
                  }
                  size={19}
                  color="#D96B8A"
                />
              </View>

              <View style={styles.activityDetails}>
                <Text
                  style={styles.activityTitle}
                  numberOfLines={1}
                >
                  {order.orderType} Order #{shortId(order.id)}
                </Text>

                <Text style={styles.activityDate}>
                  {formatDate(order.created_at)}
                </Text>

                <Text style={styles.activitySubtitle}>
                  {formatStatus(normalizeStatus(order.status))}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* RECENT PAYMENTS */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent Payments
          </Text>

          <TouchableOpacity
            onPress={handlePayments}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#D96B8A" />
        ) : recentPayments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="wallet-outline"
              size={27}
              color="#C59BA9"
            />

            <Text style={styles.emptyText}>
              No recent payments found.
            </Text>
          </View>
        ) : (
          recentPayments.map(payment => {
            const paymentStyle = getPaymentStatusStyle(
              payment.status
            );

            return (
              <View
                key={payment.id}
                style={styles.activityCard}
              >
                <View style={styles.activityIcon}>
                  <Ionicons
                    name="card-outline"
                    size={19}
                    color="#D96B8A"
                  />
                </View>

                <View style={styles.activityDetails}>
                  <Text
                    style={styles.activityTitle}
                    numberOfLines={1}
                  >
                    {formatStatus(
                      normalizeStatus(
                        payment.payment_type || 'Payment'
                      )
                    )}
                  </Text>

                  <Text style={styles.activityDate}>
                    {formatDate(payment.created_at)}
                  </Text>

                  <Text style={styles.activitySubtitle}>
                    Payment #{shortId(payment.id)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.paymentStatus,
                    paymentStyle.container,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentStatusText,
                      paymentStyle.text,
                    ]}
                  >
                    {formatStatus(
                      normalizeStatus(payment.status || 'Pending')
                    )}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* FOOTER */}
      <Text style={styles.footer}>
        Pink Blush Garment Order and Production Management System
      </Text>
    </ScrollView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F8',
  },

  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 35,
  },

  contentWide: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E2A4A',
  },

  subtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E74C3C',
    borderWidth: 1,
    borderColor: '#FFF',
  },

  welcomeSection: {
    marginBottom: 23,
  },

  welcomeTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1E2A4A',
    marginBottom: 5,
  },

  welcomeDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: '#777',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E2A4A',
    marginBottom: 11,
  },

  refreshButton: {
    padding: 5,
    marginTop: -8,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statCard: {
    width: '48.5%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F2E8EC',
  },

  statCardWide: {
    width: '23.5%',
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FCEAF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#D96B8A',
  },

  statLabel: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
  },

  loadingContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },

  loadingText: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
  },

  errorCard: {
    backgroundColor: '#FFF3F2',
    borderWidth: 1,
    borderColor: '#F2CECA',
    borderRadius: 12,
    padding: 13,
    marginBottom: 15,
  },

  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  errorTextContainer: {
    flex: 1,
    marginLeft: 9,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#A83D3D',
  },

  errorText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#995B5B',
    marginTop: 3,
  },

  retryButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 5,
  },

  retryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B84470',
  },

  quickAccessButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2E8EC',
  },

  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FCEAF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  buttonTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  buttonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E2A4A',
  },

  buttonDescription: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    lineHeight: 16,
  },

  recentSection: {
    marginTop: 16,
  },

  viewAllText: {
    fontSize: 11,
    color: '#D96B8A',
    fontWeight: 'bold',
    marginBottom: 10,
  },

  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 11,
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2E8EC',
  },

  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FCEAF0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  activityDetails: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E2A4A',
  },

  activityDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },

  activitySubtitle: {
    fontSize: 10,
    color: '#D96B8A',
    marginTop: 4,
  },

  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    marginLeft: 7,
    maxWidth: 105,
  },

  paymentStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  paidStatus: {
    backgroundColor: '#EAF6EE',
  },

  paidText: {
    color: '#39875A',
  },

  pendingStatus: {
    backgroundColor: '#FFF3E4',
  },

  pendingText: {
    color: '#B77B2E',
  },

  failedStatus: {
    backgroundColor: '#FCEAEA',
  },

  failedText: {
    color: '#C03939',
  },

  refundedStatus: {
    backgroundColor: '#EAF0FA',
  },

  refundedText: {
    color: '#5474A5',
  },

  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 11,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2E8EC',
  },

  emptyText: {
    fontSize: 11,
    color: '#999',
    marginTop: 7,
    textAlign: 'center',
  },

  footer: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 25,
    lineHeight: 17,
  },
});
