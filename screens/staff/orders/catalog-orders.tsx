
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
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

type ProductionProgress = {
  status: string;
  updated_at: string | null;
};

type FilterType =
  | 'All'
  | 'Pending'
  | 'Accepted'
  | 'In Production'
  | 'Ready for Release'
  | 'Completed'
  | 'Cancelled';

const FILTERS: FilterType[] = [
  'All',
  'Pending',
  'Accepted',
  'In Production',
  'Ready for Release',
  'Completed',
  'Cancelled',
];

const PROGRESS_FILTERS = [
  'All',
  'assigned',
  'cutting',
  'sewing',
  'fitting',
  'finishing',
  'ready_for_pickup',
  'completed',
];

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';
const BACKGROUND = '#FFF9FB';
const TEXT_DARK = '#392831';
const TEXT_MUTED = '#8D7780';

const formatMoney = (
  amount: number | string | null | undefined
) => {
  const value = Number(amount ?? 0);

  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const normalizeStatus = (
  status: string | null | undefined
) =>
  (status ?? 'Pending')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeProgress = (
  status: string | null | undefined
) =>
  (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

const displayStatus = (
  status: string | null | undefined
) => {
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

  switch (filter) {
    case 'Pending':
      return normalized === 'pending';

    case 'Accepted':
      return normalized === 'accepted';

    case 'In Production':
      return normalized === 'in production';

    case 'Ready for Release':
      return normalized === 'ready for release';

    case 'Completed':
      return normalized === 'completed';

    case 'Cancelled':
      return normalized === 'cancelled';

    default:
      return true;
  }
};

export default function CatalogOrdersScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  // RESPONSIVE LAYOUT
  const isWideScreen = width >= 750;

  const [orders, setOrders] = useState<CatalogOrder[]>([]);

  const [productionProgress, setProductionProgress] = useState<
    Record<string, ProductionProgress>
  >({});

  const [activeFilter, setActiveFilter] =
    useState<FilterType>('All');

  const [progressFilter, setProgressFilter] = useState('All');

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // LOAD CATALOG ORDERS
  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null);

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
        setProductionProgress({});
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
        productionResult,
      ] = await Promise.all([
        // CUSTOMER DETAILS
        supabase
          .from('profiles')
          .select('id, username, full_name, contact_number')
          .in('id', customerIds),

        // ORDER ITEMS
        supabase
          .from('order_items')
          .select('id, order_id')
          .in('order_id', orderIds),

        // PAYMENT DETAILS
        supabase
          .from('payments')
          .select(
            'id, order_id, payment_type, payment_method, amount, status, transaction_id, paid_at'
          )
          .in('order_id', orderIds),

        // PRODUCTION TRACKING
        supabase
          .from('production_tracking')
          .select('id, order_id, status, updated_at')
          .in('order_id', orderIds)
          .order('updated_at', { ascending: false }),
      ]);

      const results = [
        profilesResult,
        itemsResult,
        paymentsResult,
        productionResult,
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
      const productionRecords = productionResult.data ?? [];

      // GET LATEST PRODUCTION RECORD PER ORDER
      const progressMap: Record<string, ProductionProgress> = {};

      productionRecords.forEach((record: any) => {
        if (record.order_id && !progressMap[record.order_id]) {
          progressMap[record.order_id] = {
            status: record.status,
            updated_at: record.updated_at,
          };
        }
      });

      setProductionProgress(progressMap);

      // MAP CUSTOMER PROFILES
      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      // MAP ORDERS
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

      setLoadError(
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

  // OPEN MANAGE ORDER
  const openManageOrder = (orderId: string) => {
    navigation.navigate('ManageOrder', {
      orderId,
      orderType: 'catalog',
    });
  };

  // FILTER ORDERS
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = matchesFilter(
      order.status,
      activeFilter
    );

    const currentProgress = normalizeProgress(
      productionProgress[order.id]?.status
    );

    const matchesProgress =
      progressFilter === 'All' ||
      currentProgress === normalizeProgress(progressFilter);

    const search = searchQuery.trim().toLowerCase();

    const orderId = order.id.toLowerCase();
    const shortOrderId = order.id.slice(0, 8).toLowerCase();

    const matchesSearch =
      !search ||
      orderId.includes(search) ||
      shortOrderId.includes(search) ||
      order.customerName.toLowerCase().includes(search) ||
      order.customerContact.toLowerCase().includes(search) ||
      displayStatus(order.status).toLowerCase().includes(search) ||
      displayStatus(
        productionProgress[order.id]?.status
      ).toLowerCase().includes(search);

    return (
      matchesStatus &&
      matchesProgress &&
      matchesSearch
    );
  });

  // GET TOTAL PAID DEPOSIT
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

  // GET DEPOSIT PAYMENT
  // PRIORITIZE A PAID DEPOSIT OVER PENDING OR FAILED PAYMENTS
  const getDepositPayment = (order: CatalogOrder) =>
    order.payments.find(
      (payment) =>
        normalizeStatus(payment.payment_type) === 'deposit' &&
        normalizeStatus(payment.status) === 'paid'
    ) ??
    order.payments.find(
      (payment) =>
        normalizeStatus(payment.payment_type) === 'deposit'
    );

  // LOADING SCREEN
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PINK} />

        <Text style={styles.loadingText}>
          Loading catalog orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADING AND SEARCH */}
      <View style={styles.topSection}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Catalog Orders
            </Text>

            <Text style={styles.orderCount}>
              {filteredOrders.length} of {orders.length} orders
            </Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, order ID, or contact..."
            placeholderTextColor="#A9959D"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearSearch}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CATALOG ORDER STATUS FILTERS */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            Catalog Order Status
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
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
                activeOpacity={0.8}
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

        {/* PRODUCTION PROGRESS FILTER */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            Production Progress
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressFilterContainer}
        >
          {PROGRESS_FILTERS.map((item) => {
            const selected = progressFilter === item;

            const label =
              item === 'All'
                ? 'All'
                : displayStatus(item);

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.progressFilterButton,
                  selected && styles.progressFilterButtonActive,
                ]}
                onPress={() => setProgressFilter(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.progressFilterText,
                    selected && styles.progressFilterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ORDERS LIST */}
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
        showsVerticalScrollIndicator={false}
      >
        {/* ERROR STATE */}
        {loadError ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              Unable to Load Orders
            </Text>

            <Text style={styles.emptyText}>
              {loadError}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadOrders}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {searchQuery ||
              activeFilter !== 'All' ||
              progressFilter !== 'All'
                ? 'No matching orders'
                : 'No catalog orders yet'}
            </Text>

            <Text style={styles.emptyText}>
              {searchQuery ||
              activeFilter !== 'All' ||
              progressFilter !== 'All'
                ? 'Try changing your search or filters.'
                : 'Customer catalog orders will appear here.'}
            </Text>

            {(searchQuery.length > 0 ||
              activeFilter !== 'All' ||
              progressFilter !== 'All') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('All');
                  setProgressFilter('All');
                }}
              >
                <Text style={styles.clearFiltersText}>
                  Clear Search and Filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.ordersGrid,
              isWideScreen && styles.ordersGridWide,
            ]}
          >
            {filteredOrders.map((order) => {
              const total = Number(order.total_amount ?? 0);
              const paidDeposit = getPaidDeposit(order);
              const depositPayment = getDepositPayment(order);

              const depositStatus = depositPayment
                ? displayStatus(depositPayment.status)
                : 'No Payment';

              const isDepositPaid =
                normalizeStatus(depositPayment?.status) === 'paid';

              const currentProgress =
                productionProgress[order.id]?.status || null;

              return (
                <View
                  key={order.id}
                  style={[
                    styles.orderCard,
                    isWideScreen && styles.orderCardWide,
                  ]}
                >
                  {/* ORDER HEADER */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.orderTitle}>
                        Catalog Order
                      </Text>

                      <Text style={styles.orderId}>
                        Order ID: #{order.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {displayStatus(order.status)}
                      </Text>
                    </View>
                  </View>

                  {/* SUBMITTED DATE */}
                  <Text style={styles.submittedDate}>
                    Submitted{' '}
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString(
                          'en-PH',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }
                        )
                      : 'Date unavailable'}
                  </Text>

                  {/* CURRENT PRODUCTION STAGE */}
                  <View style={styles.productionProgressBox}>
                    <Text style={styles.progressCardLabel}>
                      Production Progress
                    </Text>

                    <Text style={styles.progressCardValue}>
                      {currentProgress
                        ? displayStatus(currentProgress)
                        : 'Not Started'}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* CUSTOMER */}
                  <Text style={styles.infoLabel}>Customer</Text>

                  <Text style={styles.customerName}>
                    {order.customerName}
                  </Text>

                  <Text style={styles.contactText}>
                    {order.customerContact || 'No contact number'}
                  </Text>

                  {/* ORDER SUMMARY */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.infoLabel}>Items</Text>

                      <Text style={styles.infoValue}>
                        {order.itemCount}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.infoLabel}>Order Total</Text>

                      <Text style={styles.totalValue}>
                        {formatMoney(total)}
                      </Text>
                    </View>
                  </View>

                  {/* DEPOSIT STATUS */}
                  <View style={styles.depositRow}>
                    <View style={styles.depositLeft}>
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

                  {/* MANAGE ORDER */}
                  <TouchableOpacity
                    style={styles.manageOrderButton}
                    onPress={() => openManageOrder(order.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.manageOrderButtonText}>
                      Manage Order
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 10,
  },

  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: BACKGROUND,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  orderCount: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  searchContainer: {
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0DFE5',
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  searchIcon: {
    fontSize: 20,
    color: TEXT_MUTED,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    fontSize: 12,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  clearButton: {
    paddingHorizontal: 4,
  },

  clearSearch: {
    fontSize: 21,
    color: TEXT_MUTED,
  },

  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 5,
  },

  filterButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F5E9EE',
  },

  filterButtonActive: {
    backgroundColor: PINK,
  },

  filterText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
  },

  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  progressHeader: {
    marginTop: 2,
    marginBottom: 4,
  },

  progressTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  progressFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 5,
  },

  progressFilterButton: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#F5E9EE',
  },

  progressFilterButtonActive: {
    backgroundColor: DARK_PINK,
  },

  progressFilterText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_MUTED,
  },

  progressFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  orderList: {
    flex: 1,
  },

  orderListContent: {
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 25,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  ordersGrid: {
    width: '100%',
    flexDirection: 'column',
  },

  ordersGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  orderCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1E3E8',
  },

  orderCardWide: {
    width: '49%',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  cardTitleContainer: {
    flex: 1,
  },

  orderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  orderId: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#FCE7F0',
    maxWidth: '48%',
  },

  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: DARK_PINK,
  },

  submittedDate: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 7,
  },

  productionProgressBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF6F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 7,
    marginTop: 10,
  },

  progressCardLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
  },

  progressCardValue: {
    fontSize: 10,
    fontWeight: '700',
    color: DARK_PINK,
    backgroundColor: '#FCE7F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    overflow: 'hidden',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1E7EB',
    marginVertical: 10,
  },

  infoLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 3,
  },

  customerName: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_DARK,
  },

  contactText: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
  },

  detailItem: {
    minWidth: '40%',
    flex: 1,
  },

  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  totalValue: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_PINK,
  },

  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF6F9',
    borderRadius: 8,
  },

  depositLeft: {
    flex: 1,
  },

  depositTitle: {
    color: '#543541',
    fontSize: 11,
    fontWeight: '700',
  },

  depositAmount: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 3,
  },

  paymentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },

  paidBadge: {
    backgroundColor: '#DCFCE7',
  },

  unpaidBadge: {
    backgroundColor: '#FEF3C7',
  },

  paymentBadgeText: {
    fontSize: 9,
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
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manageOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 55,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },

  clearFiltersButton: {
    backgroundColor: '#F7EAF0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },

  clearFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_PINK,
  },

  retryButton: {
    backgroundColor: DARK_PINK,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
