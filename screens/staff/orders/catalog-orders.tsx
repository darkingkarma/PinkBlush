
import { useCallback, useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

type Payment = {
  id: string;
  order_id: string;
  payment_type: string;
  payment_method: string;
  amount: number | string;
  status: string;
  transaction_id: string | null;
  paid_at: string | null;
};

type CatalogOrder = {
  id: string;
  customer_id: string;
  status: string | null;
  total_amount: number | string | null;
  created_at: string | null;
  customerName: string;
  customerContact: string;
  itemCount: number;
  payments: Payment[];
};

type FilterType =
  | 'All'
  | 'Pending'
  | 'In Production'
  | 'Ready for Release'
  | 'Completed'
  | 'Cancelled';

const FILTERS: FilterType[] = [
  'All',
  'Pending',
  'In Production',
  'Ready for Release',
  'Completed',
  'Cancelled',
];

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';

const formatMoney = (amount: number | string | null | undefined) => {
  const value = Number(amount ?? 0);

  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? 'Pending')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .trim();

const displayStatus = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);

  return normalized.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
};

const matchesFilter = (
  status: string | null | undefined,
  filter: FilterType
) => {
  if (filter === 'All') return true;

  const normalized = normalizeStatus(status);

  if (filter === 'Pending') {
    return normalized.includes('pending');
  }

  if (filter === 'In Production') {
    return normalized.includes('in production');
  }

  if (filter === 'Ready for Release') {
    return normalized.includes('ready for release');
  }

  if (filter === 'Completed') {
    return normalized.includes('completed');
  }

  if (filter === 'Cancelled') {
    return (
      normalized.includes('cancelled') ||
      normalized.includes('canceled')
    );
  }

  return true;
};

export default function CatalogOrdersScreen() {
  const navigation = useNavigation<any>();

  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const { data: orderRows, error: ordersError } =
        await supabase
          .from('orders')
          .select(
            'id, customer_id, status, total_amount, created_at'
          )
          .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orderRows || orderRows.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);

      const customerIds = [
        ...new Set(orderRows.map((order) => order.customer_id)),
      ];

      const [
        profilesResult,
        itemsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, contact_number')
          .in('id', customerIds),

        supabase
          .from('order_items')
          .select('id, order_id')
          .in('order_id', orderIds),

        supabase
          .from('payments')
          .select(
            'id, order_id, payment_type, payment_method, amount, status, transaction_id, paid_at'
          )
          .in('order_id', orderIds),
      ]);

      const results = [
        profilesResult,
        itemsResult,
        paymentsResult,
      ];

      const failedResult = results.find(
        (result) => result.error
      );

      if (failedResult?.error) {
        throw failedResult.error;
      }

      const profiles = profilesResult.data ?? [];
      const orderItems = itemsResult.data ?? [];
      const payments = paymentsResult.data ?? [];

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const mappedOrders: CatalogOrder[] = orderRows.map(
        (order) => {
          const profile = profileMap.get(order.customer_id);

          return {
            id: order.id,
            customer_id: order.customer_id,
            status: order.status,
            total_amount: order.total_amount,
            created_at: order.created_at,

            customerName:
              profile?.full_name ||
              profile?.username ||
              'Unknown customer',

            customerContact:
              profile?.contact_number ?? '',

            itemCount: orderItems.filter(
              (item) => item.order_id === order.id
            ).length,

            payments: payments.filter(
              (payment) => payment.order_id === order.id
            ),
          };
        }
      );

      setOrders(mappedOrders);
    } catch (error: any) {
      console.error('Error loading catalog orders:', error);

      Alert.alert(
        'Unable to Load Orders',
        error?.message ??
          'Something went wrong while loading catalog orders.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const openManageOrder = (orderId: string) => {
    navigation.navigate('ManageOrder', {
      orderId,
      orderType: 'catalog',
    });
  };

  const filteredOrders = orders.filter((order) =>
    matchesFilter(order.status, activeFilter)
  );

  const getPaidDeposit = (order: CatalogOrder) =>
    order.payments
      .filter(
        (payment) =>
          normalizeStatus(payment.payment_type) === 'deposit' &&
          normalizeStatus(payment.status) === 'paid'
      )
      .reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      );

  const getDepositPayment = (order: CatalogOrder) =>
    order.payments.find(
      (payment) =>
        normalizeStatus(payment.payment_type) === 'deposit'
    );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>
          Loading catalog orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Heading with Total Order Count */}
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons
            name="shirt-outline"
            size={25}
            color={PINK}
          />
        </View>

        <View style={styles.headingText}>
          <Text style={styles.title}>Catalog Orders</Text>
          <Text style={styles.subtitle}>
            View and manage customer garment orders.
          </Text>
        </View>

        <View style={styles.totalCountBadge}>
          <Text style={styles.totalCountNumber}>
            {orders.length}
          </Text>
          <Text style={styles.totalCountLabel}>
            Total Orders
          </Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selected && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.orderList}
        contentContainerStyle={styles.orderListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PINK}
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="receipt-outline"
              size={42}
              color="#C4A5B0"
            />

            <Text style={styles.emptyTitle}>
              No Catalog Orders Found
            </Text>

            <Text style={styles.emptyText}>
              There are no catalog orders under this filter yet.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const total = Number(order.total_amount ?? 0);
            const paidDeposit = getPaidDeposit(order);
            const depositPayment = getDepositPayment(order);

            const depositStatus = depositPayment
              ? displayStatus(depositPayment.status)
              : 'No Payment';

            const isDepositPaid =
              normalizeStatus(depositPayment?.status) === 'paid';

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderTop}>
                  <View style={styles.orderTitleArea}>
                    <View style={styles.orderIcon}>
                      <Ionicons
                        name="receipt-outline"
                        size={19}
                        color={DARK_PINK}
                      />
                    </View>

                    <View style={styles.orderHeading}>
                      <Text style={styles.orderTitle}>
                        Catalog Order
                      </Text>

                      <Text style={styles.orderId}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {displayStatus(order.status)}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.dateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color="#9B7784"
                  />

                  <Text style={styles.dateText}>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString(
                          'en-PH',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )
                      : 'Date unavailable'}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Customer */}
                <View style={styles.customerRow}>
                  <View style={styles.customerIcon}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={PINK}
                    />
                  </View>

                  <View style={styles.customerDetails}>
                    <Text style={styles.smallLabel}>
                      CUSTOMER
                    </Text>

                    <Text style={styles.customerName}>
                      {order.customerName}
                    </Text>

                    {order.customerContact ? (
                      <Text style={styles.customerContact}>
                        {order.customerContact}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Order Summary */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.smallLabel}>
                      ITEMS
                    </Text>

                    <View style={styles.infoValueRow}>
                      <Ionicons
                        name="shirt-outline"
                        size={16}
                        color={DARK_PINK}
                      />

                      <Text style={styles.infoValue}>
                        {order.itemCount}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={styles.smallLabel}>
                      ORDER TOTAL
                    </Text>

                    <Text style={styles.totalValue}>
                      {formatMoney(total)}
                    </Text>
                  </View>
                </View>

                {/* Deposit Status */}
                <View style={styles.depositRow}>
                  <View style={styles.depositLeft}>
                    <Ionicons
                      name="wallet-outline"
                      size={17}
                      color="#8C6674"
                    />

                    <View>
                      <Text style={styles.depositTitle}>
                        Deposit Payment
                      </Text>

                      <Text style={styles.depositAmount}>
                        {formatMoney(paidDeposit)} paid
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.paymentBadge,
                      isDepositPaid
                        ? styles.paidBadge
                        : styles.unpaidBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentBadgeText,
                        isDepositPaid
                          ? styles.paidText
                          : styles.unpaidText,
                      ]}
                    >
                      {depositStatus}
                    </Text>
                  </View>
                </View>

                {/* Manage Order */}
                <TouchableOpacity
                  style={styles.manageOrderButton}
                  onPress={() => openManageOrder(order.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.manageOrderButtonText}>
                    Manage Order
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    paddingTop: 12,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8FA',
  },

  loadingText: {
    marginTop: 12,
    color: '#8C6674',
  },

  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headingText: {
    flex: 1,
    marginLeft: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3F2630',
  },

  subtitle: {
    fontSize: 11,
    color: '#8C6674',
    marginTop: 3,
  },

  totalCountBadge: {
    backgroundColor: '#FCE7F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  totalCountNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK_PINK,
  },

  totalCountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B3455',
  },

  filterScroll: {
    maxHeight: 46,
    flexGrow: 0,
  },

  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D9E2',
  },

  filterButtonActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },

  filterText: {
    color: '#805C69',
    fontSize: 12,
    fontWeight: '600',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  orderList: {
    flex: 1,
  },

  orderListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3F2630',
    marginTop: 12,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#8C6674',
    marginTop: 6,
    lineHeight: 19,
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E3E9',
  },

  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  orderTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  orderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderHeading: {
    flex: 1,
  },

  orderTitle: {
    color: '#3F2630',
    fontSize: 15,
    fontWeight: '800',
  },

  orderId: {
    color: '#9B7784',
    fontSize: 11,
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: '#FCE7F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: '48%',
  },

  statusText: {
    color: DARK_PINK,
    fontSize: 11,
    fontWeight: '700',
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },

  dateText: {
    color: '#9B7784',
    fontSize: 11,
  },

  divider: {
    height: 1,
    backgroundColor: '#F2E5EA',
    marginVertical: 14,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  customerIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerDetails: {
    flex: 1,
  },

  smallLabel: {
    color: '#A1848E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  customerName: {
    color: '#3F2630',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },

  customerContact: {
    color: '#8C6674',
    fontSize: 11,
    marginTop: 3,
  },

  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },

  infoBox: {
    flex: 1,
    backgroundColor: '#FFFAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F6E9EE',
  },

  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
  },

  infoValue: {
    color: '#3F2630',
    fontSize: 17,
    fontWeight: '800',
  },

  totalValue: {
    color: DARK_PINK,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },

  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FFFAFC',
    borderRadius: 12,
  },

  depositLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },

  depositTitle: {
    color: '#543541',
    fontSize: 12,
    fontWeight: '700',
  },

  depositAmount: {
    color: '#8C6674',
    fontSize: 11,
    marginTop: 3,
  },

  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },

  paidBadge: {
    backgroundColor: '#DCFCE7',
  },

  unpaidBadge: {
    backgroundColor: '#FEF3C7',
  },

  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  paidText: {
    color: '#166534',
  },

  unpaidText: {
    color: '#92400E',
  },

  manageOrderButton: {
    backgroundColor: DARK_PINK,
    borderRadius: 11,
    padding: 13,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },

  manageOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
});
