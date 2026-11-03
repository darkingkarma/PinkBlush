
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';

type Payment = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  payment_type: string;
  payment_method: string;
  amount: number | string;
  status: string;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
};

type PaymentRecord = Payment & {
  customerName: string;
  customerEmail: string;
  customerContact: string;
  orderReference: string;
  orderDescription: string;
  orderStatus: string;
  orderType: 'Catalog Order' | 'Custom Order';
  orderFound: boolean;
};

type FilterType =
  | 'all'
  | 'paid'
  | 'pending'
  | 'failed'
  | 'cancelled';

type MethodFilter =
  | 'all'
  | 'gcash'
  | 'paypal'
  | 'cash';

type TypeFilter = 'all' | 'deposit' | 'balance';

const formatCurrency = (amount: number | string) => {
  const value = Number(amount) || 0;

  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getAmount = (amount: number | string) => {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
};

const formatDate = (date: string | null) => {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const capitalize = (value: string | null | undefined) => {
  if (!value) return 'Not specified';

  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalize = (value: string | null | undefined) =>
  (value || '').trim().toLowerCase();

export default function ManagePaymentsScreen() {
  const navigation = useNavigation<any>();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<FilterType>('all');

  const [methodFilter, setMethodFilter] =
    useState<MethodFilter>('all');

  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>('all');

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);

  // =====================================================
  // LOAD PAYMENTS
  // =====================================================

  const loadPayments = useCallback(async () => {
    try {
      const { data: paymentData, error: paymentError } =
        await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      const rawPayments = (paymentData || []) as Payment[];

      if (rawPayments.length === 0) {
        setPayments([]);
        return;
      }

      const orderIds = [
        ...new Set(
          rawPayments
            .map((payment) => payment.order_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const customOrderIds = [
        ...new Set(
          rawPayments
            .map((payment) => payment.custom_order_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      // LOAD CATALOG ORDERS

      let orders: any[] = [];

      if (orderIds.length > 0) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, customer_id, status')
          .in('id', orderIds);

        if (error) throw error;

        orders = data || [];
      }

      // LOAD CUSTOM ORDERS

      let customOrders: any[] = [];

      if (customOrderIds.length > 0) {
        const { data, error } = await supabase
          .from('custom_orders')
          .select('id, user_id, garment_description, status')
          .in('id', customOrderIds);

        if (error) throw error;

        customOrders = data || [];
      }

      // GET CUSTOMER IDS

      const customerIds = [
        ...new Set(
          [
            ...orders.map((order) => order.customer_id),
            ...customOrders.map((order) => order.user_id),
          ].filter(Boolean)
        ),
      ];

      // LOAD CUSTOMER PROFILES

      let profiles: any[] = [];

      if (customerIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'id, full_name, username, email, contact_number'
          )
          .in('id', customerIds);

        if (error) throw error;

        profiles = data || [];
      }

      // COMBINE PAYMENT INFORMATION

      const formattedPayments: PaymentRecord[] =
        rawPayments.map((payment) => {
          const catalogOrder = orders.find(
            (order) => order.id === payment.order_id
          );

          const customOrder = customOrders.find(
            (order) => order.id === payment.custom_order_id
          );

          const isCustom = Boolean(payment.custom_order_id);

          const customerId = isCustom
            ? customOrder?.user_id
            : catalogOrder?.customer_id;

          const profile = profiles.find(
            (item) => item.id === customerId
          );

          const orderFound = isCustom
            ? Boolean(customOrder)
            : Boolean(catalogOrder);

          return {
            ...payment,

            customerName:
              profile?.full_name ||
              profile?.username ||
              'Unknown Customer',

            customerEmail: profile?.email || '',
            customerContact: profile?.contact_number || '',

            orderReference: isCustom
              ? payment.custom_order_id || ''
              : payment.order_id || '',

            orderDescription: isCustom
              ? customOrder?.garment_description ||
                'Custom Garment Order'
              : 'Catalog Garment Order',

            orderStatus:
              (isCustom
                ? customOrder?.status
                : catalogOrder?.status) || 'Unknown',

            orderType: isCustom
              ? 'Custom Order'
              : 'Catalog Order',

            orderFound,
          };
        });

      setPayments(formattedPayments);
    } catch (error: any) {
      console.error('Load payments error:', error);

      Alert.alert(
        'Unable to Load Payments',
        error.message ||
          'Something went wrong while loading payments.'
      );
    }
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        await loadPayments();
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [loadPayments]);

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadPayments();
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // VIEW ORDER
  // =====================================================

  const handleViewOrder = (payment: PaymentRecord) => {
    if (!payment.orderReference || !payment.orderFound) {
      Alert.alert(
        'Order Not Found',
        'The order associated with this payment could not be found.'
      );
      return;
    }

    navigation.navigate('ManageOrder', {
      orderId: payment.orderReference,
      orderType:
        payment.orderType === 'Custom Order'
          ? 'custom'
          : 'catalog',
    });
  };

  // =====================================================
  // PAYMENT SUMMARY
  // =====================================================

  const summary = useMemo(() => {
    const paidPayments = payments.filter(
      (payment) => normalize(payment.status) === 'paid'
    );

    const pendingPayments = payments.filter(
      (payment) => normalize(payment.status) === 'pending'
    );

    const totalReceived = paidPayments.reduce(
      (total, payment) => total + getAmount(payment.amount),
      0
    );

    const totalPending = pendingPayments.reduce(
      (total, payment) => total + getAmount(payment.amount),
      0
    );

    const totalDeposits = paidPayments
      .filter(
        (payment) =>
          normalize(payment.payment_type) === 'deposit'
      )
      .reduce(
        (total, payment) => total + getAmount(payment.amount),
        0
      );

    const totalBalances = paidPayments
      .filter(
        (payment) =>
          normalize(payment.payment_type) === 'balance'
      )
      .reduce(
        (total, payment) => total + getAmount(payment.amount),
        0
      );

    return {
      totalReceived,
      totalPending,
      totalDeposits,
      totalBalances,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
    };
  }, [payments]);

  // =====================================================
  // SEARCH AND FILTERS
  // =====================================================

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const searchableValues = [
        payment.customerName,
        payment.customerEmail,
        payment.customerContact,
        payment.transaction_id,
        payment.orderReference,
        payment.orderDescription,
        payment.id,
        payment.payment_method,
        payment.payment_type,
        payment.status,
      ];

      const matchesSearch =
        !keyword ||
        searchableValues.some((value) =>
          normalize(value).includes(keyword)
        );

      const matchesStatus =
        statusFilter === 'all' ||
        normalize(payment.status) === statusFilter;

      const matchesMethod =
        methodFilter === 'all' ||
        normalize(payment.payment_method) === methodFilter;

      const matchesType =
        typeFilter === 'all' ||
        normalize(payment.payment_type) === typeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod &&
        matchesType
      );
    });
  }, [
    payments,
    search,
    statusFilter,
    methodFilter,
    typeFilter,
  ]);

  // =====================================================
  // FILTER BUTTON
  // =====================================================

  const FilterButton = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.filterButton,
        selected && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          selected && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // =====================================================
  // PAYMENT STATUS
  // =====================================================

  const getStatusStyle = (status: string) => {
    switch (normalize(status)) {
      case 'paid':
        return styles.paidBadge;

      case 'pending':
        return styles.pendingBadge;

      case 'failed':
        return styles.failedBadge;

      case 'cancelled':
        return styles.cancelledBadge;

      default:
        return styles.defaultBadge;
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D96B8A" />

        <Text style={styles.loadingText}>
          Loading payments...
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN SCREEN
  // =====================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#D96B8A"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Payment Management
            </Text>

            <Text style={styles.subtitle}>
              Monitor customer payments and transactions.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <Text style={styles.sectionTitle}>
          Payment Overview
        </Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Total Received
            </Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(summary.totalReceived)}
            </Text>

            <Text style={styles.summaryDescription}>
              {summary.paidCount} successful payments
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Pending Payments
            </Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(summary.totalPending)}
            </Text>

            <Text style={styles.summaryDescription}>
              {summary.pendingCount} awaiting confirmation
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Deposits Received
            </Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(summary.totalDeposits)}
            </Text>

            <Text style={styles.summaryDescription}>
              Paid deposits
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Balances Received
            </Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(summary.totalBalances)}
            </Text>

            <Text style={styles.summaryDescription}>
              Paid balances
            </Text>
          </View>
        </View>

        {/* PAYMENT RECORDS */}

        <Text style={styles.sectionTitle}>
          Payment Records
        </Text>

        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, order, transaction..."
            placeholderTextColor="#A58A94"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearchText}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* STATUS FILTER */}

        <Text style={styles.filterLabel}>
          Payment Status
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterButton
            label="All"
            selected={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />

          <FilterButton
            label="Paid"
            selected={statusFilter === 'paid'}
            onPress={() => setStatusFilter('paid')}
          />

          <FilterButton
            label="Pending"
            selected={statusFilter === 'pending'}
            onPress={() => setStatusFilter('pending')}
          />

          <FilterButton
            label="Failed"
            selected={statusFilter === 'failed'}
            onPress={() => setStatusFilter('failed')}
          />

          <FilterButton
            label="Cancelled"
            selected={statusFilter === 'cancelled'}
            onPress={() => setStatusFilter('cancelled')}
          />
        </ScrollView>

        {/* METHOD FILTER */}

        <Text style={styles.filterLabel}>
          Payment Method
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterButton
            label="All Methods"
            selected={methodFilter === 'all'}
            onPress={() => setMethodFilter('all')}
          />

          <FilterButton
            label="GCash"
            selected={methodFilter === 'gcash'}
            onPress={() => setMethodFilter('gcash')}
          />

          <FilterButton
            label="PayPal"
            selected={methodFilter === 'paypal'}
            onPress={() => setMethodFilter('paypal')}
          />

          <FilterButton
            label="Cash"
            selected={methodFilter === 'cash'}
            onPress={() => setMethodFilter('cash')}
          />
        </ScrollView>

        {/* PAYMENT TYPE FILTER */}

        <Text style={styles.filterLabel}>
          Payment Type
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterButton
            label="All Types"
            selected={typeFilter === 'all'}
            onPress={() => setTypeFilter('all')}
          />

          <FilterButton
            label="Deposit"
            selected={typeFilter === 'deposit'}
            onPress={() => setTypeFilter('deposit')}
          />

          <FilterButton
            label="Balance"
            selected={typeFilter === 'balance'}
            onPress={() => setTypeFilter('balance')}
          />
        </ScrollView>

        {/* RESULT COUNT */}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>
            Payment Transactions
          </Text>

          <Text style={styles.resultCount}>
            {filteredPayments.length} records
          </Text>
        </View>

        {/* PAYMENT LIST */}

        {filteredPayments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No Payments Found
            </Text>

            <Text style={styles.emptyText}>
              No payment records match your search or filters.
            </Text>
          </View>
        ) : (
          filteredPayments.map((payment) => (
            <View
              key={payment.id}
              style={styles.paymentCard}
            >
              <View style={styles.paymentTopRow}>
                <View style={styles.paymentMain}>
                  <Text style={styles.customerName}>
                    {payment.customerName}
                  </Text>

                  <Text style={styles.orderType}>
                    {payment.orderType}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(payment.status),
                  ]}
                >
                  <Text style={styles.statusText}>
                    {capitalize(payment.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.paymentDivider} />

              <View style={styles.paymentInfoRow}>
                <Text style={styles.infoLabel}>
                  Payment Type
                </Text>

                <Text style={styles.infoValue}>
                  {capitalize(payment.payment_type)}
                </Text>
              </View>

              <View style={styles.paymentInfoRow}>
                <Text style={styles.infoLabel}>
                  Method
                </Text>

                <Text style={styles.infoValue}>
                  {capitalize(payment.payment_method)}
                </Text>
              </View>

              <View style={styles.paymentInfoRow}>
                <Text style={styles.infoLabel}>
                  Date
                </Text>

                <Text style={styles.infoValue}>
                  {formatDate(
                    payment.paid_at || payment.created_at
                  )}
                </Text>
              </View>

              <View style={styles.paymentBottomRow}>
                <Text style={styles.amountLabel}>
                  Amount
                </Text>

                <Text style={styles.paymentAmount}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>

              {/* VIEW ORDER */}

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!payment.orderFound}
                style={[
                  styles.viewOrderButton,
                  !payment.orderFound && styles.disabledButton,
                ]}
                onPress={() => handleViewOrder(payment)}
              >
                <Text style={styles.viewOrderButtonText}>
                  {payment.orderFound
                    ? 'View Order'
                    : 'Order Unavailable'}
                </Text>
              </TouchableOpacity>

              {/* VIEW PAYMENT DETAILS */}

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.viewDetails}
                onPress={() => setSelectedPayment(payment)}
              >
                <Text style={styles.viewDetailsText}>
                  View Payment Details
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 25 }} />
      </ScrollView>

      {/* PAYMENT DETAILS MODAL */}

      <Modal
        visible={selectedPayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Payment Details
                </Text>

                <Text style={styles.modalSubtitle}>
                  Complete transaction information
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedPayment(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>
                  X
                </Text>
              </TouchableOpacity>
            </View>

            {selectedPayment && (
              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalAmountContainer}>
                  <Text style={styles.modalAmountLabel}>
                    Payment Amount
                  </Text>

                  <Text style={styles.modalAmount}>
                    {formatCurrency(selectedPayment.amount)}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(selectedPayment.status),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {capitalize(selectedPayment.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSectionTitle}>
                  Customer Information
                </Text>

                <DetailRow
                  label="Customer"
                  value={selectedPayment.customerName}
                />

                <DetailRow
                  label="Email"
                  value={selectedPayment.customerEmail || 'Not available'}
                />

                <DetailRow
                  label="Contact"
                  value={selectedPayment.customerContact || 'Not available'}
                />

                <Text style={styles.modalSectionTitle}>
                  Order Information
                </Text>

                <DetailRow
                  label="Order Type"
                  value={selectedPayment.orderType}
                />

                <DetailRow
                  label="Order ID"
                  value={selectedPayment.orderReference || 'Not available'}
                />

                <DetailRow
                  label="Description"
                  value={selectedPayment.orderDescription}
                />

                <DetailRow
                  label="Order Status"
                  value={capitalize(selectedPayment.orderStatus)}
                />

                <Text style={styles.modalSectionTitle}>
                  Transaction Information
                </Text>

                <DetailRow
                  label="Payment ID"
                  value={selectedPayment.id}
                />

                <DetailRow
                  label="Payment Type"
                  value={capitalize(selectedPayment.payment_type)}
                />

                <DetailRow
                  label="Payment Method"
                  value={capitalize(selectedPayment.payment_method)}
                />

                <DetailRow
                  label="Transaction ID"
                  value={selectedPayment.transaction_id || 'Not available'}
                />

                <DetailRow
                  label="Payment Date"
                  value={formatDate(selectedPayment.paid_at)}
                />

                <DetailRow
                  label="Record Created"
                  value={formatDate(selectedPayment.created_at)}
                />

                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setSelectedPayment(null)}
            >
              <Text style={styles.closeModalButtonText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =====================================================
// DETAIL ROW
// =====================================================

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 25,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
  },

  loadingText: {
    marginTop: 12,
    color: '#8C6674',
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3F2630',
  },

  subtitle: {
    fontSize: 12,
    color: '#987987',
    marginTop: 5,
  },

  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FCEAF0',
    marginLeft: 10,
  },

  refreshButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D96B8A',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3F2630',
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  summaryCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#F4E4E9',
  },

  summaryLabel: {
    fontSize: 11,
    color: '#987987',
    fontWeight: '600',
  },

  summaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3F2630',
    marginTop: 9,
  },

  summaryDescription: {
    fontSize: 10,
    color: '#A88E99',
    marginTop: 5,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D9E2',
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 48,
    marginBottom: 16,
  },

  searchInput: {
    flex: 1,
    color: '#3F2630',
    fontSize: 12,
  },

  clearSearchText: {
    fontSize: 11,
    color: '#D96B8A',
    fontWeight: '700',
    marginLeft: 8,
  },

  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#795866',
    marginBottom: 8,
    marginTop: 3,
  },

  filterRow: {
    gap: 8,
    paddingBottom: 13,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EED5DE',
  },

  filterButtonActive: {
    backgroundColor: '#D96B8A',
    borderColor: '#D96B8A',
  },

  filterText: {
    color: '#936F7D',
    fontSize: 11,
    fontWeight: '700',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3F2630',
  },

  resultCount: {
    fontSize: 11,
    color: '#987987',
  },

  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1E1E7',
  },

  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentMain: {
    flex: 1,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3F2630',
  },

  orderType: {
    fontSize: 11,
    color: '#987987',
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  paidBadge: {
    backgroundColor: '#E4F5EA',
  },

  pendingBadge: {
    backgroundColor: '#FFF1D9',
  },

  failedBadge: {
    backgroundColor: '#FCE5E5',
  },

  cancelledBadge: {
    backgroundColor: '#F0E9ED',
  },

  defaultBadge: {
    backgroundColor: '#F0E9ED',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5F4B54',
  },

  paymentDivider: {
    height: 1,
    backgroundColor: '#F3E8EC',
    marginVertical: 13,
  },

  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },

  infoLabel: {
    fontSize: 11,
    color: '#A08791',
  },

  infoValue: {
    fontSize: 11,
    color: '#5B414C',
    fontWeight: '700',
  },

  paymentBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#F3E8EC',
  },

  amountLabel: {
    fontSize: 12,
    color: '#987987',
    fontWeight: '600',
  },

  paymentAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D96B8A',
  },

  viewOrderButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D96B8A',
    borderRadius: 11,
    paddingVertical: 12,
    marginTop: 14,
  },

  disabledButton: {
    backgroundColor: '#C9B9BF',
  },

  viewOrderButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  viewDetails: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#F7EDF1',
  },

  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D96B8A',
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F1E1E7',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3F2630',
  },

  emptyText: {
    fontSize: 12,
    color: '#987987',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 15, 22, 0.45)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#FFF8FA',
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    padding: 19,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3F2630',
  },

  modalSubtitle: {
    fontSize: 11,
    color: '#987987',
    marginTop: 4,
  },

  closeButton: {
    width: 37,
    height: 37,
    borderRadius: 20,
    backgroundColor: '#FCEAF0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#795866',
  },

  modalAmountContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 17,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F1E1E7',
  },

  modalAmountLabel: {
    fontSize: 12,
    color: '#987987',
  },

  modalAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D96B8A',
    marginVertical: 9,
  },

  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#B84470',
    marginTop: 13,
    marginBottom: 9,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E4E9',
    gap: 12,
  },

  detailLabel: {
    flex: 0.85,
    fontSize: 11,
    color: '#987987',
  },

  detailValue: {
    flex: 1.4,
    fontSize: 11,
    fontWeight: '700',
    color: '#513944',
    textAlign: 'right',
  },

  closeModalButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 13,
  },

  closeModalButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
