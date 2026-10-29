
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
          'id, user_id, reference_image_url, garment_description, special_instructions, preferred_color, fabric_preference, needed_by_date, status, quoted_price, deposit_amount, quotation_note, created_at'
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
        created_at: order.created_at,
      },
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
            color="#d96b8a"
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
          color="#d96b8a"
        />
        <Text style={styles.loadingText}>
          Loading custom orders...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Custom Orders</Text>
        <Text style={styles.subtitle}>
          Review requests, customer details, and quotations.
        </Text>
      </View>

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

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOrders(false);
            }}
            tintColor="#d96b8a"
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color="#d96b8a"
            />
          </View>

          <View>
            <Text style={styles.summaryNumber}>
              {orders.length}
            </Text>
            <Text style={styles.summaryLabel}>
              Total Custom Requests
            </Text>
          </View>
        </View>

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
              <View style={styles.cardTop}>
                <Text
                  style={styles.orderTitle}
                  numberOfLines={2}
                >
                  {order.garment_description}
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {formatStatus(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.dateText}>
                Submitted:{' '}
                {new Date(order.created_at).toLocaleDateString()}
              </Text>

              {renderCustomerDetails(order.user_id)}

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
                      ).toLocaleDateString()
                    : 'Not specified'}
                </Text>
              </View>

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

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => openReviewRequest(order)}
              >
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.viewButtonText}>
                  Review Request
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#faf9f8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf9f8',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },
  subtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  filterScroll: {
    maxHeight: 50,
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#f0e8eb',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#d96b8a',
  },
  filterText: {
    color: '#76515e',
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 35,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 17,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0e6e9',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#fff0f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  summaryNumber: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#f0e6e9',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },
  statusBadge: {
    backgroundColor: '#fff0f4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: 125,
  },
  statusText: {
    color: '#b44e70',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
  },
  customerBox: {
    backgroundColor: '#fff8fa',
    borderWidth: 1,
    borderColor: '#f1dce4',
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
    backgroundColor: '#ffeaf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e2a4a',
  },
  customerCaption: {
    fontSize: 11,
    color: '#98727f',
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
    color: '#66545b',
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1eaec',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  preferenceTitle: {
    color: '#1e2a4a',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 7,
  },
  preferenceText: {
    color: '#66545b',
    fontSize: 12,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1eaec',
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
    backgroundColor: '#eaf8ef',
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
    backgroundColor: '#fff0f4',
    padding: 11,
    borderRadius: 9,
    marginTop: 12,
  },
  declinedText: {
    flex: 1,
    color: '#a33d61',
    fontSize: 12,
    lineHeight: 18,
  },
  viewButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e2a4a',
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
