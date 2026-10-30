
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

import { Ionicons } from '@expo/vector-icons';
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

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';

export default function ManageOrdersScreen() {
  const navigation = useNavigation<any>();

  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [customerProfiles, setCustomerProfiles] =
    useState<Record<string, CustomerProfile>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('custom_orders')
        .select(
          'id, user_id, reference_image_url, garment_description, special_instructions, preferred_color, fabric_preference, needed_by_date, status, quoted_price, deposit_amount, quotation_note, estimated_completion_date, created_at'
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const orderList = (data ?? []) as CustomOrder[];

      setOrders(orderList);

      const customerIds = [
        ...new Set(orderList.map((order) => order.user_id)),
      ];

      if (customerIds.length > 0) {
        const { data: profiles, error: profileError } =
          await supabase
            .from('profiles')
            .select(
              'id, username, full_name, contact_number, email, role'
            )
            .in('id', customerIds);

        if (profileError) {
          console.warn(
            'Could not load customer profiles:',
            profileError.message
          );
        } else {
          const profileMap: Record<string, CustomerProfile> = {};

          (profiles ?? []).forEach((profile) => {
            profileMap[profile.id] = profile as CustomerProfile;
          });

          setCustomerProfiles(profileMap);
        }
      } else {
        setCustomerProfiles({});
      }
    } catch (error: any) {
      Alert.alert(
        'Unable to Load Orders',
        error?.message ?? 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getCustomerName = (userId: string) => {
    const profile = customerProfiles[userId];

    return (
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      'Name not provided'
    );
  };

  const getCustomerEmail = (userId: string) => {
    return (
      customerProfiles[userId]?.email ||
      'Email not available'
    );
  };

  const getCustomerContact = (userId: string) => {
    return (
      customerProfiles[userId]?.contact_number ||
      'Contact number not provided'
    );
  };

  const formatStatus = (status: string) =>
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const formatMoney = (amount: number) =>
    `₱${Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const openReviewRequest = (order: CustomOrder) => {
    navigation.navigate('ReviewRequest', {
      order: {
        id: order.id,
        user_id: order.user_id,
        reference_image_url: order.reference_image_url,
        garment_description: order.garment_description,
        special_instructions: order.special_instructions,
        preferred_color: order.preferred_color,
        fabric_preference: order.fabric_preference,
        needed_by_date: order.needed_by_date,
        status: order.status,
        quoted_price: order.quoted_price,
        deposit_amount: order.deposit_amount,
        quotation_note: order.quotation_note,
        estimated_completion_date: order.estimated_completion_date,
        created_at: order.created_at,
      },
    });
  };

  const openManageOrder = (orderId: string) => {
    navigation.navigate('ManageOrder', {
      orderId,
      orderType: 'custom',
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'All') {
      return true;
    }

    if (filter === 'Needs Quote') {
      return ['submitted', 'under_review'].includes(order.status);
    }

    if (filter === 'Quoted') {
      return ['quoted', 'quotation_sent'].includes(order.status);
    }

    return order.status === filter.toLowerCase();
  });

  const renderCustomerDetails = (userId: string) => (
    <View style={styles.customerBox}>
      <View style={styles.customerHeading}>
        <View style={styles.customerIcon}>
          <Ionicons
            name="person"
            size={21}
            color={PINK}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>
            {getCustomerName(userId)}
          </Text>

          <Text style={styles.customerCaption}>
            Customer Details
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons
          name="mail-outline"
          size={17}
          color="#9a6477"
        />

        <Text style={styles.detailText}>
          {getCustomerEmail(userId)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Ionicons
          name="call-outline"
          size={17}
          color="#9a6477"
        />

        <Text style={styles.detailText}>
          {getCustomerContact(userId)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={PINK}
        />

        <Text style={styles.loadingText}>
          Loading custom orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Heading with Total Order Count */}
      <View style={styles.header}>
        <View style={styles.headingIcon}>
          <Ionicons
            name="cut-outline"
            size={25}
            color={PINK}
          />
        </View>

        <View style={styles.headingText}>
          <Text style={styles.heading}>Custom Orders</Text>

          <Text style={styles.subtitle}>
            Review requests and manage custom garment orders.
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
        contentContainerStyle={styles.filterContainer}
      >
        {[
          'All',
          'Needs Quote',
          'Quoted',
          'accepted',
          'declined',
          'completed',
        ].map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilter,
            ]}
            onPress={() => setFilter(item)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.activeFilterText,
              ]}
            >
              {[
                'accepted',
                'declined',
                'completed',
              ].includes(item)
                ? formatStatus(item)
                : item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.orderList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOrders(false);
            }}
            tintColor={PINK}
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="file-tray-outline"
              size={48}
              color="#c5a3ae"
            />

            <Text style={styles.emptyTitle}>
              No Custom Orders
            </Text>

            <Text style={styles.emptyText}>
              Orders matching this filter will appear here.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View
              key={order.id}
              style={styles.orderCard}
            >
              {/* Order Header */}
              <View style={styles.cardTop}>
                <View style={styles.orderIcon}>
                  <Ionicons
                    name="shirt-outline"
                    size={20}
                    color={DARK_PINK}
                  />
                </View>

                <View style={styles.orderTitleArea}>
                  <Text
                    style={styles.orderTitle}
                    numberOfLines={2}
                  >
                    {order.garment_description}
                  </Text>

                  <Text style={styles.orderId}>
                    #{order.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {formatStatus(order.status)}
                  </Text>
                </View>
              </View>

              {/* Submission Date */}
              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color="#9B7784"
                />

                <Text style={styles.dateText}>
                  Submitted:{' '}
                  {new Date(order.created_at).toLocaleDateString(
                    'en-PH',
                    {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }
                  )}
                </Text>
              </View>

              {/* Customer Details */}
              {renderCustomerDetails(order.user_id)}

              {/* Order Preferences */}
              <View style={styles.preferenceBox}>
                <Text style={styles.preferenceTitle}>
                  Order Preferences
                </Text>

                <Text style={styles.preferenceText}>
                  Color: {order.preferred_color || 'Not specified'}
                </Text>

                <Text style={styles.preferenceText}>
                  Fabric: {order.fabric_preference || 'Not specified'}
                </Text>

                <Text style={styles.preferenceText}>
                  Needed by:{' '}
                  {order.needed_by_date
                    ? new Date(
                        `${order.needed_by_date}T12:00:00`
                      ).toLocaleDateString('en-PH')
                    : 'Not specified'}
                </Text>
              </View>

              {/* Quotation */}
              {order.quoted_price != null && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    Total Quotation
                  </Text>

                  <Text style={styles.priceValue}>
                    {formatMoney(order.quoted_price)}
                  </Text>
                </View>
              )}

              {/* Accepted Notice */}
              {order.status === 'accepted' && (
                <View style={styles.decisionNotice}>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color="#238052"
                  />

                  <Text style={styles.decisionText}>
                    Customer accepted the quotation. Ready for the next step.
                  </Text>
                </View>
              )}

              {/* Declined Notice */}
              {order.status === 'declined' && (
                <View style={styles.declinedNotice}>
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color="#b44e70"
                  />

                  <Text style={styles.declinedText}>
                    Customer declined the quotation.
                  </Text>
                </View>
              )}

              {/* Review Request */}
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => openReviewRequest(order)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color="#fff"
                />

                <Text style={styles.buttonText}>
                  Review Request
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* Manage Order - Accepted Custom Orders */}
              {order.status === 'accepted' && (
                <TouchableOpacity
                  style={styles.manageOrderButton}
                  onPress={() => openManageOrder(order.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color="#fff"
                  />

                  <Text style={styles.buttonText}>
                    Manage Order
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </View>
          ))
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
  },

  loadingText: {
    marginTop: 12,
    color: '#8C6674',
  },

  header: {
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

  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3F2630',
  },

  subtitle: {
    color: '#8C6674',
    fontSize: 11,
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

  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D9E2',
  },

  activeFilter: {
    backgroundColor: PINK,
    borderColor: PINK,
  },

  filterText: {
    color: '#805C69',
    fontSize: 12,
    fontWeight: '600',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

  orderList: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 35,
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E3E9',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  orderIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderTitleArea: {
    flex: 1,
  },

  orderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3F2630',
  },

  orderId: {
    color: '#9B7784',
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor: '#FCE7F0',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: 105,
  },

  statusText: {
    color: DARK_PINK,
    fontSize: 10,
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

  customerBox: {
    backgroundColor: '#FFF8FA',
    borderWidth: 1,
    borderColor: '#F1DCE4',
    borderRadius: 12,
    padding: 12,
    marginTop: 13,
  },

  customerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  customerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFEAF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3F2630',
  },

  customerCaption: {
    fontSize: 11,
    color: '#98727F',
    marginTop: 2,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 7,
  },

  detailText: {
    flex: 1,
    color: '#66545B',
    fontSize: 12,
    lineHeight: 18,
  },

  preferenceBox: {
    backgroundColor: '#FFFAFC',
    borderWidth: 1,
    borderColor: '#F1EAEC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },

  preferenceTitle: {
    color: '#3F2630',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 7,
  },

  preferenceText: {
    color: '#66545B',
    fontSize: 12,
    lineHeight: 20,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1EAEC',
  },

  priceLabel: {
    color: '#666',
    fontSize: 13,
  },

  priceValue: {
    color: '#238052',
    fontSize: 15,
    fontWeight: 'bold',
  },

  decisionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF8EF',
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },

  decisionText: {
    flex: 1,
    color: '#237346',
    fontSize: 12,
    lineHeight: 18,
  },

  declinedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F4',
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },

  declinedText: {
    flex: 1,
    color: '#A33D61',
    fontSize: 12,
    lineHeight: 18,
  },

  reviewButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 11,
    padding: 13,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },

  manageOrderButton: {
    backgroundColor: DARK_PINK,
    borderRadius: 11,
    padding: 13,
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#3F2630',
    marginTop: 12,
  },

  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
    fontSize: 13,
  },
});
