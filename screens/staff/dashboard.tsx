import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
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

export default function StaffDashboard({ navigation }: Props) {
  const rootNavigation =
    useNavigation<NavigationProp<RootStackParamList>>();

  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
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
        supabase.from('orders').select('status'),

        supabase.from('custom_orders').select('status'),

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

      setHasUnreadNotifications(
        (unreadNotificationsResult.count ?? 0) > 0
      );

      const catalogOrders = catalogResult.data ?? [];
      const customOrders = customResult.data ?? [];

      const allStatuses = [
        ...catalogOrders.map(order =>
          (order.status ?? '').toLowerCase().replace(/ /g, '_')
        ),
        ...customOrders.map(order =>
          (order.status ?? '').toLowerCase().replace(/ /g, '_')
        ),
      ];

      const pendingStatuses = [
        'pending',
        'submitted',
        'under_review',
        'quoted',
        'quotation_sent',
      ];

      const productionStatuses = [
        'assigned',
        'in_production',
        'cutting',
        'sewing',
        'fitting',
        'finishing',
      ];

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

      const catalogRecent: RecentOrder[] = (
        catalogRecentResult.data ?? []
      ).map(order => ({
        id: order.id,
        status: order.status ?? 'Pending',
        created_at: order.created_at,
        orderType: 'Catalog',
      }));

      const customRecent: RecentOrder[] = (
        customRecentResult.data ?? []
      ).map(order => ({
        id: order.id,
        status: order.status ?? 'Submitted',
        created_at: order.created_at,
        orderType: 'Custom',
      }));

      const combinedOrders = [...catalogRecent, ...customRecent]
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
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

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

  const formatDate = (date: string) => {
    if (!date) return 'Date unavailable';

    return new Date(date).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  };

  const shortId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color="#d96b8a"
          />

          {hasUnreadNotifications && (
            <View style={styles.notificationDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* WELCOME TEXT */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome Back!</Text>

        <Text style={styles.welcomeDescription}>
          Here's an overview of your orders, payments, and production
          activities.
        </Text>
      </View>

      {/* ORDER OVERVIEW */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Order Overview</Text>

        <TouchableOpacity onPress={loadDashboard}>
          <Ionicons
            name="refresh-outline"
            size={20}
            color="#d96b8a"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#d96b8a" />

          <Text style={styles.loadingText}>
            Loading dashboard...
          </Text>
        </View>
      ) : (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.totalOrders}
            </Text>

            <Text style={styles.statLabel}>Total Orders</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.pendingOrders}
            </Text>

            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.inProduction}
            </Text>

            <Text style={styles.statLabel}>In Production</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.readyForPickup}
            </Text>

            <Text style={styles.statLabel}>Ready for Pickup</Text>
          </View>
        </View>
      )}

      {/* QUICK ACCESS */}
      <Text style={styles.sectionTitle}>Quick Access</Text>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handleReports}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons name="bar-chart-outline" size={22} color="#d96b8a" />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>Reports Management</Text>
          <Text style={styles.buttonDescription}>
            View production, payment, and material reports
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#d96b8a" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handlePayments}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons name="wallet-outline" size={22} color="#d96b8a" />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>Manage Payments</Text>
          <Text style={styles.buttonDescription}>
            Review customer deposits, balances, and payments
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#d96b8a" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAccessButton}
        onPress={handleManageGarments}
        activeOpacity={0.8}
      >
        <View style={styles.buttonIconContainer}>
          <Ionicons name="shirt-outline" size={22} color="#d96b8a" />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>Manage Garments</Text>
          <Text style={styles.buttonDescription}>
            Manage garment categories, designs, and fabrics
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#d96b8a" />
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
            color="#d96b8a"
          />
        </View>

        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonTitle}>Manage Orders</Text>
          <Text style={styles.buttonDescription}>
            Review catalog orders, custom requests, and assignments
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#d96b8a" />
      </TouchableOpacity>

      {/* RECENT ORDERS */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>

          <TouchableOpacity onPress={handleManageOrders}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#d96b8a" />
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent orders found.</Text>
          </View>
        ) : (
          recentOrders.map(order => (
            <View
              key={`${order.orderType}-${order.id}`}
              style={styles.activityCard}
            >
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>
                  {order.orderType} Order #{shortId(order.id)}
                </Text>

                <Text style={styles.activityDate}>
                  {formatDate(order.created_at)}
                </Text>

                <Text style={styles.activitySubtitle}>
                  {formatStatus(order.status)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* RECENT PAYMENTS */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>

          <TouchableOpacity onPress={handlePayments}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#d96b8a" />
        ) : recentPayments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent payments found.</Text>
          </View>
        ) : (
          recentPayments.map(payment => (
            <View key={payment.id} style={styles.activityCard}>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>
                  {formatStatus(payment.payment_type || 'Payment')}
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
                  payment.status?.toLowerCase() === 'paid'
                    ? styles.paidStatus
                    : styles.unpaidStatus,
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    payment.status?.toLowerCase() === 'paid'
                      ? styles.paidText
                      : styles.unpaidText,
                  ]}
                >
                  {formatStatus(payment.status || 'Pending')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* FOOTER */}
      <Text style={styles.footer}>
        Pink Blush Garment Order and Production Management System
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },

  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },

  subtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },

  welcomeSection: {
    marginBottom: 23,
  },

  welcomeTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1e2a4a',
    marginBottom: 5,
  },

  welcomeDescription: {
    fontSize: 12,
    lineHeight: 18,
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
    color: '#1e2a4a',
    marginBottom: 11,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#d96b8a',
  },

  statLabel: {
    fontSize: 10,
    color: '#777',
    marginTop: 3,
  },

  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
    marginBottom: 18,
  },

  loadingText: {
    fontSize: 11,
    color: '#777',
    marginTop: 7,
  },

  quickAccessButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fceaf0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  buttonTextContainer: {
    flex: 1,
  },

  buttonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },

  buttonDescription: {
    fontSize: 10,
    color: '#777',
    marginTop: 4,
    lineHeight: 15,
  },

  recentSection: {
    marginTop: 15,
  },

  viewAllText: {
    fontSize: 11,
    color: '#d96b8a',
    fontWeight: 'bold',
    marginBottom: 10,
  },

  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 11,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  activityDetails: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },

  activityDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },

  activitySubtitle: {
    fontSize: 10,
    color: '#d96b8a',
    marginTop: 4,
  },

  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    marginLeft: 5,
  },

  paidStatus: {
    backgroundColor: '#eaf6ee',
  },

  unpaidStatus: {
    backgroundColor: '#fff3e4',
  },

  paymentStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  paidText: {
    color: '#39875a',
  },

  unpaidText: {
    color: '#b77b2e',
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 17,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 11,
    color: '#999',
  },

  footer: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 23,
    lineHeight: 16,
  },
});