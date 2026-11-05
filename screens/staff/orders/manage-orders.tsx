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

type CustomOrder = {
  id: string;
  user_id: string;
  reference_image_url: string | null;
  garment_description: string;
  special_instructions: string | null;
  preferred_color: string | null;
  fabric_preference: string | null;
  needed_by_date: string | null;
  status: string;
  quoted_price: number | null;
  deposit_amount: number | null;
  quotation_note: string | null;
  estimated_completion_date: string | null;
  created_at: string;
};

type CustomerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  contact_number: string | null;
  email: string | null;
  role: string | null;
};

type ProductionProgress = {
  status: string;
  updated_at: string | null;
};

type FilterType =
  | 'All'
  | 'Submitted'
  | 'Under Review'
  | 'Quotation Sent'
  | 'Accepted'
  | 'In Production'
  | 'Ready for Fitting'
  | 'Ready for Release'
  | 'Completed'
  | 'Declined'
  | 'Cancelled';

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';
const BACKGROUND = '#FFF9FB';
const TEXT_DARK = '#392831';
const TEXT_MUTED = '#8D7780';

const FILTERS: FilterType[] = [
  'All',
  'Submitted',
  'Under Review',
  'Quotation Sent',
  'Accepted',
  'In Production',
  'Ready for Fitting',
  'Ready for Release',
  'Completed',
  'Declined',
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

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeProgress = (status: string | null | undefined) =>
  (status ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');

const formatStatus = (status: string) => {
  const normalized = normalizeStatus(status);

  return normalized.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
};

const matchesOrderFilter = (
  status: string,
  selectedFilter: FilterType
) => {
  const normalized = normalizeStatus(status);

  switch (selectedFilter) {
    case 'All':
      return true;
    case 'Submitted':
      return normalized === 'submitted';
    case 'Under Review':
      return normalized === 'under review';
    case 'Quotation Sent':
      return normalized === 'quotation sent';
    case 'Accepted':
      return normalized === 'accepted';
    case 'In Production':
      return normalized === 'in production';
    case 'Ready for Fitting':
      return normalized === 'ready for fitting';
    case 'Ready for Release':
      return normalized === 'ready for release';
    case 'Completed':
      return normalized === 'completed';
    case 'Declined':
      return normalized === 'declined';
    case 'Cancelled':
      return normalized === 'cancelled';
    default:
      return true;
  }
};

export default function ManageOrdersScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 700;

  const [orders, setOrders] = useState<CustomOrder[]>([]);

  const [customerProfiles, setCustomerProfiles] = useState<
    Record<string, CustomerProfile>
  >({});

  const [productionProgress, setProductionProgress] = useState<
    Record<string, ProductionProgress>
  >({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterType>('All');
  const [progressFilter, setProgressFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // LOAD CUSTOM ORDERS
  const loadOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setLoadError(null);

      const { data, error } = await supabase
        .from('custom_orders')
        .select(`
          id,
          user_id,
          reference_image_url,
          garment_description,
          special_instructions,
          preferred_color,
          fabric_preference,
          needed_by_date,
          status,
          quoted_price,
          deposit_amount,
          quotation_note,
          estimated_completion_date,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orderData = (data || []) as CustomOrder[];

      const orderIds = orderData.map((order) => order.id);

      // LOAD LATEST PRODUCTION PROGRESS
      let progressMap: Record<string, ProductionProgress> = {};

      if (orderIds.length > 0) {
        const { data: productionData, error: productionError } =
          await supabase
            .from('production_tracking')
            .select('id, custom_order_id, status, updated_at')
            .in('custom_order_id', orderIds)
            .order('updated_at', { ascending: false });

        if (productionError) throw productionError;

        (productionData || []).forEach((record: any) => {
          if (
            record.custom_order_id &&
            !progressMap[record.custom_order_id]
          ) {
            progressMap[record.custom_order_id] = {
              status: record.status,
              updated_at: record.updated_at,
            };
          }
        });
      }

      // LOAD CUSTOMER PROFILES
      const customerIds = [
        ...new Set(orderData.map((order) => order.user_id)),
      ];

      let profileMap: Record<string, CustomerProfile> = {};

      if (customerIds.length > 0) {
        const { data: profiles, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'id, username, full_name, contact_number, email, role'
            )
            .in('id', customerIds);

        if (profileError) throw profileError;

        (profiles || []).forEach((profile: CustomerProfile) => {
          profileMap[profile.id] = profile;
        });
      }

      // UPDATE SCREEN DATA AFTER SUCCESSFUL LOAD
      setOrders(orderData);
      setProductionProgress(progressMap);
      setCustomerProfiles(profileMap);
    } catch (error: any) {
      console.error('Error loading custom orders:', error);

      setLoadError(
        error?.message || 'Unable to load custom orders. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(false);
  };

  const handleRetry = () => {
    loadOrders(true);
  };

  // CUSTOMER INFORMATION
  const getCustomerName = (userId: string) => {
    const customer = customerProfiles[userId];

    return (
      customer?.full_name ||
      customer?.username ||
      'Unknown Customer'
    );
  };

  const getCustomerEmail = (userId: string) =>
    customerProfiles[userId]?.email || 'No email provided';

  const getCustomerContact = (userId: string) =>
    customerProfiles[userId]?.contact_number || 'No contact number';

  // STATUS COLORS
  const getStatusStyle = (status: string) => {
    switch (normalizeProgress(status)) {
      case 'submitted':
        return styles.statusPending;

      case 'under_review':
        return styles.statusReview;

      case 'quotation_sent':
        return styles.statusQuoted;

      case 'accepted':
        return styles.statusAccepted;

      case 'declined':
      case 'cancelled':
        return styles.statusDeclined;

      case 'completed':
        return styles.statusCompleted;

      case 'in_production':
      case 'assigned':
      case 'cutting':
      case 'sewing':
        return styles.statusProduction;

      case 'ready_for_fitting':
      case 'fitting':
      case 'finishing':
        return styles.statusFitting;

      case 'ready_for_release':
      case 'ready_for_pickup':
        return styles.statusReady;

      default:
        return styles.statusPending;
    }
  };

  // FORMAT MONEY
  const formatMoney = (amount: number | null) => {
    if (amount === null || amount === undefined) {
      return 'Not set';
    }

    return `₱${Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // FORMAT DATE AND TIME
  const formatDate = (date: string | null) => {
    if (!date) return 'Not specified';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not specified';
    }

    return parsedDate.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // FORMAT DATE-ONLY FIELD
  const formatPreferredDate = (date: string | null) => {
    if (!date) return 'Not specified';

    const [year, month, day] = date.split('-').map(Number);

    if (!year || !month || !day) {
      return 'Not specified';
    }

    return new Date(year, month - 1, day).toLocaleDateString(
      'en-PH',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  // NAVIGATION
  const openReviewRequest = (order: CustomOrder) => {
    navigation.navigate('ReviewRequest', { order });
  };

  const openManageOrder = (order: CustomOrder) => {
    navigation.navigate('ManageOrder', {
      orderId: order.id,
      orderType: 'custom',
    });
  };

  // FILTER ORDERS
  const filteredOrders = orders.filter((order) => {
    const matchesFilterResult = matchesOrderFilter(
      order.status,
      filter
    );

    const productionStatus = normalizeProgress(
      productionProgress[order.id]?.status
    );

    const matchesProgressFilter =
      progressFilter === 'All' ||
      productionStatus === normalizeProgress(progressFilter);

    const customer = customerProfiles[order.user_id];
    const search = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !search ||
      order.id.toLowerCase().includes(search) ||
      order.id.slice(0, 8).toLowerCase().includes(search) ||
      order.garment_description.toLowerCase().includes(search) ||
      (order.special_instructions || '').toLowerCase().includes(search) ||
      (order.preferred_color || '').toLowerCase().includes(search) ||
      (order.fabric_preference || '').toLowerCase().includes(search) ||
      (customer?.full_name || '').toLowerCase().includes(search) ||
      (customer?.username || '').toLowerCase().includes(search) ||
      (customer?.email || '').toLowerCase().includes(search) ||
      (customer?.contact_number || '').toLowerCase().includes(search) ||
      formatStatus(order.status).toLowerCase().includes(search) ||
      formatStatus(
        productionProgress[order.id]?.status || ''
      )
        .toLowerCase()
        .includes(search);

    return (
      matchesFilterResult &&
      matchesProgressFilter &&
      matchesSearch
    );
  });

  // NEEDS REVIEW COUNT
  const needsQuoteCount = orders.filter((order) => {
    const status = normalizeStatus(order.status);

    return status === 'submitted' || status === 'under review';
  }).length;

  // ORDERS THAT CAN BE MANAGED
  // Payment and assignment eligibility must still be checked
  // inside ManageOrderScreen and by the database/backend.
  const manageableStatuses = [
    'accepted',
    'in_production',
    'ready_for_fitting',
    'ready_for_release',
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PINK} />

        <Text style={styles.loadingText}>
          Loading custom orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Custom Orders
            </Text>

            <Text style={styles.orderCount}>
              {filteredOrders.length} of {orders.length} orders
              {needsQuoteCount > 0
                ? `  ·  ${needsQuoteCount} need review`
                : ''}
            </Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, order ID, or garment..."
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

        {/* CUSTOM ORDER STATUS FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTERS.map((item) => {
            const selected = filter === item;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.filterButton,
                  selected && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* PRODUCTION PROGRESS FILTERS */}
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
              item === 'All' ? 'All' : formatStatus(item);

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
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PINK}
            colors={[PINK]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* INLINE ERROR */}
        {loadError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              Unable to load orders
            </Text>

            <Text style={styles.errorText}>
              {loadError}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {searchQuery ||
              filter !== 'All' ||
              progressFilter !== 'All'
                ? 'No matching orders'
                : 'No custom orders yet'}
            </Text>

            <Text style={styles.emptyText}>
              {searchQuery ||
              filter !== 'All' ||
              progressFilter !== 'All'
                ? 'Try changing your search or filters.'
                : 'Customer custom requests will appear here.'}
            </Text>

            {(searchQuery.length > 0 ||
              filter !== 'All' ||
              progressFilter !== 'All') && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setFilter('All');
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
              isLargeScreen && styles.ordersGridLarge,
            ]}
          >
            {filteredOrders.map((order) => {
              const orderStatus = normalizeProgress(order.status);

              const canManageOrder =
                manageableStatuses.includes(orderStatus);

              const canReviewRequest = ![
                'completed',
                'declined',
                'cancelled',
              ].includes(orderStatus);

              const currentProgress =
                productionProgress[order.id]?.status || null;

              return (
                <View
                  key={order.id}
                  style={[
                    styles.orderCard,
                    isLargeScreen && styles.orderCardLarge,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                      <Text
                        style={styles.garmentTitle}
                        numberOfLines={2}
                      >
                        {order.garment_description}
                      </Text>

                      <Text style={styles.orderId}>
                        Order ID: {order.id}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        getStatusStyle(order.status),
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {formatStatus(order.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.submittedDate}>
                    Submitted {formatDate(order.created_at)}
                  </Text>

                  {/* CURRENT PRODUCTION STAGE */}
                  <View style={styles.productionProgressBox}>
                    <Text style={styles.progressCardLabel}>
                      Production Progress
                    </Text>

                    <Text
                      style={[
                        styles.progressCardValue,
                        currentProgress
                          ? getStatusStyle(currentProgress)
                          : styles.progressNotStarted,
                      ]}
                    >
                      {currentProgress
                        ? formatStatus(currentProgress)
                        : 'Not Started'}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* CUSTOMER */}
                  <Text style={styles.infoLabel}>
                    Customer
                  </Text>

                  <Text style={styles.infoValue}>
                    {getCustomerName(order.user_id)}
                  </Text>

                  <Text style={styles.contactText}>
                    {getCustomerEmail(order.user_id)}
                  </Text>

                  <Text style={styles.contactText}>
                    {getCustomerContact(order.user_id)}
                  </Text>

                  {/* ORDER DETAILS */}
                  <View style={styles.detailsGrid}>
                    {order.preferred_color ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.infoLabel}>
                          Preferred Color
                        </Text>

                        <Text style={styles.infoValue}>
                          {order.preferred_color}
                        </Text>
                      </View>
                    ) : null}

                    {order.fabric_preference ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.infoLabel}>
                          Fabric Preference
                        </Text>

                        <Text style={styles.infoValue}>
                          {order.fabric_preference}
                        </Text>
                      </View>
                    ) : null}

                    {order.needed_by_date ? (
                      <View style={styles.detailItem}>
                        <Text style={styles.infoLabel}>
                          Preferred Needed-By Date
                        </Text>

                        <Text style={styles.infoValue}>
                          {formatPreferredDate(order.needed_by_date)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* QUOTATION */}
                  {order.quoted_price !== null && (
                    <View style={styles.quotationBox}>
                      <View style={styles.quotationRow}>
                        <Text style={styles.quotationLabel}>
                          Quoted Total
                        </Text>

                        <Text style={styles.quotationValue}>
                          {formatMoney(order.quoted_price)}
                        </Text>
                      </View>

                      {order.deposit_amount !== null && (
                        <View style={styles.quotationRow}>
                          <Text style={styles.quotationLabel}>
                            Required Deposit
                          </Text>

                          <Text style={styles.quotationValue}>
                            {formatMoney(order.deposit_amount)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* STATUS NOTICES */}
                  {orderStatus === 'submitted' && (
                    <Text style={styles.productionNotice}>
                      Custom order request has been submitted and
                      needs review.
                    </Text>
                  )}

                  {orderStatus === 'under_review' && (
                    <Text style={styles.productionNotice}>
                      Custom order request is currently under review.
                    </Text>
                  )}

                  {orderStatus === 'quotation_sent' && (
                    <Text style={styles.acceptedNotice}>
                      Quotation has been sent to the customer.
                    </Text>
                  )}

                  {orderStatus === 'accepted' && (
                    <Text style={styles.acceptedNotice}>
                      Customer accepted the quotation.
                    </Text>
                  )}

                  {orderStatus === 'in_production' && (
                    <Text style={styles.productionNotice}>
                      Order is currently in production.
                    </Text>
                  )}

                  {orderStatus === 'ready_for_fitting' && (
                    <Text style={styles.fittingNotice}>
                      Garment is ready for customer fitting.
                    </Text>
                  )}

                  {orderStatus === 'ready_for_release' && (
                    <Text style={styles.readyNotice}>
                      Order is ready for customer pickup.
                    </Text>
                  )}

                  {orderStatus === 'completed' && (
                    <Text style={styles.acceptedNotice}>
                      Customer has received the finished garment.
                    </Text>
                  )}

                  {orderStatus === 'declined' && (
                    <Text style={styles.declinedNotice}>
                      This custom order has been declined.
                    </Text>
                  )}

                  {orderStatus === 'cancelled' && (
                    <Text style={styles.declinedNotice}>
                      This order has been cancelled.
                    </Text>
                  )}

                  {/* ACTIONS */}
                  <View style={styles.actionsContainer}>
                    {canReviewRequest && (
                      <TouchableOpacity
                        style={[
                          styles.reviewButton,
                          !canManageOrder && styles.fullWidthButton,
                        ]}
                        onPress={() => openReviewRequest(order)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.reviewButtonText}>
                          Review Request
                        </Text>
                      </TouchableOpacity>
                    )}

                    {canManageOrder && (
                      <TouchableOpacity
                        style={[
                          styles.manageButton,
                          !canReviewRequest && styles.fullWidthButton,
                        ]}
                        onPress={() => openManageOrder(order)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.manageButtonText}>
                          Manage Order
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
    padding: 20,
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
  },

  listScroll: {
    flex: 1,
  },

  listContent: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 25,
  },

  ordersGrid: {
    width: '100%',
  },

  ordersGridLarge: {
    maxWidth: 1100,
    alignSelf: 'center',
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

  orderCardLarge: {
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

  garmentTitle: {
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
    borderRadius: 6,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  statusPending: {
    backgroundColor: '#FFF1D6',
  },

  statusReview: {
    backgroundColor: '#E8EFFF',
  },

  statusQuoted: {
    backgroundColor: '#F4E9FF',
  },

  statusAccepted: {
    backgroundColor: '#E2F5E9',
  },

  statusDeclined: {
    backgroundColor: '#FCE7E7',
  },

  statusCompleted: {
    backgroundColor: '#E3F2F2',
  },

  statusProduction: {
    backgroundColor: '#FFF0D8',
  },

  statusFitting: {
    backgroundColor: '#EDE7FF',
  },

  statusReady: {
    backgroundColor: '#E3F5EA',
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
    gap: 8,
  },

  progressCardLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
    flex: 1,
  },

  progressCardValue: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_DARK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    overflow: 'hidden',
    textAlign: 'center',
  },

  progressNotStarted: {
    backgroundColor: '#F1E7EB',
    color: TEXT_MUTED,
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

  infoValue: {
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

  quotationBox: {
    backgroundColor: '#FFF6F9',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 7,
  },

  quotationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  quotationLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
  },

  quotationValue: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  acceptedNotice: {
    color: '#398253',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },

  declinedNotice: {
    color: '#B84444',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },

  productionNotice: {
    color: '#A66A18',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },

  fittingNotice: {
    color: '#7256A8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },

  readyNotice: {
    color: '#398253',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },

  reviewButton: {
    flex: 1,
    backgroundColor: PINK,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  manageButton: {
    flex: 1,
    backgroundColor: '#F7EAF0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manageButtonText: {
    color: DARK_PINK,
    fontSize: 11,
    fontWeight: '700',
  },

  fullWidthButton: {
    flex: 1,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 55,
    paddingHorizontal: 20,
    width: '100%',
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

  errorContainer: {
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F3CACA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },

  errorTitle: {
    color: '#A83232',
    fontSize: 13,
    fontWeight: '800',
  },

  errorText: {
    color: '#8E4A4A',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#B84444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
    marginTop: 10,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});