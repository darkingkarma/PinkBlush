
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../supabase';

import {
  MainTabParamList,
  RootStackParamList,
} from '../../navigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type OrderUpdate = {
  id: string;
  status: string | null;
  created_at: string | null;
  orderType: 'Catalog' | 'Custom';
  description?: string | null;
  productionStatus?: string | null;
  productionUpdatedAt?: string | null;
};

type Design = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

const normalizeStatus = (status: string | null | undefined) =>
  (status || '').toLowerCase().trim().replace(/\s+/g, '_');

const formatStatus = (status: string | null | undefined) => {
  if (!status) return 'Status unavailable';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const isActiveOrder = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);

  return ![
    'completed',
    'cancelled',
    'canceled',
    'declined',
    'rejected',
  ].includes(normalized);
};

const getStatusColor = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);

  if (['completed', 'released'].includes(normalized)) {
    return '#23865B';
  }

  if (
    ['in_production', 'in_progress', 'processing', 'production'].includes(
      normalized
    )
  ) {
    return '#3976C5';
  }

  if (
    ['declined', 'rejected', 'cancelled', 'canceled'].includes(normalized)
  ) {
    return '#C94C4C';
  }

  if (
    ['ready_for_release', 'ready_for_pickup'].includes(normalized)
  ) {
    return '#A36A16';
  }

  return '#D96B8A';
};

const formatDateTime = (date: string | null) => {
  if (!date) return 'Date unavailable';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable';
  }

  const formattedDate = parsedDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = parsedDate.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${formattedDate} • ${formattedTime}`;
};

export default function HomeScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderUpdate[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchHomeData = async () => {
        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) throw userError;

          if (!user) {
            if (isActive) {
              setOrders([]);
              setDesigns([]);
              setLoadingOrders(false);
              setLoadingDesigns(false);
            }
            return;
          }

          const [
            catalogResult,
            customResult,
            designsResult,
            productionResult,
          ] = await Promise.all([
            supabase
              .from('orders')
              .select('id, status, created_at')
              .eq('customer_id', user.id)
              .order('created_at', { ascending: false }),

            supabase
              .from('custom_orders')
              .select('id, status, created_at, garment_description')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),

            supabase
              .from('designs')
              .select('id, name, description, image_url')
              .order('created_at', { ascending: false }),

            supabase
              .from('production_tracking')
              .select(`
                id,
                order_id,
                custom_order_id,
                status,
                updated_at
              `)
              .order('updated_at', { ascending: false }),
          ]);

          if (catalogResult.error) throw catalogResult.error;
          if (customResult.error) throw customResult.error;
          if (designsResult.error) throw designsResult.error;
          if (productionResult.error) throw productionResult.error;

          // Get the latest production update for each order.
          const latestProductionUpdates = new Map<
            string,
            {
              status: string | null;
              updated_at: string | null;
            }
          >();

          (productionResult.data || []).forEach((item) => {
            const orderId = item.order_id || item.custom_order_id;

            if (!orderId) return;

            if (!latestProductionUpdates.has(orderId)) {
              latestProductionUpdates.set(orderId, {
                status: item.status,
                updated_at: item.updated_at,
              });
            }
          });

          const catalogOrders: OrderUpdate[] = (
            catalogResult.data || []
          )
            .filter((item) => isActiveOrder(item.status))
            .map((item) => {
              const production = latestProductionUpdates.get(item.id);

              return {
                id: item.id,
                status: item.status,
                created_at: item.created_at,
                orderType: 'Catalog',
                productionStatus: production?.status || null,
                productionUpdatedAt: production?.updated_at || null,
              };
            });

          const customOrders: OrderUpdate[] = (
            customResult.data || []
          )
            .filter((item) => isActiveOrder(item.status))
            .map((item) => {
              const production = latestProductionUpdates.get(item.id);

              return {
                id: item.id,
                status: item.status,
                created_at: item.created_at,
                orderType: 'Custom',
                description: item.garment_description,
                productionStatus: production?.status || null,
                productionUpdatedAt: production?.updated_at || null,
              };
            });

          const allOrders = [...catalogOrders, ...customOrders];

          allOrders.sort((a, b) => {
            const dateA = a.created_at
              ? new Date(a.created_at).getTime()
              : 0;

            const dateB = b.created_at
              ? new Date(b.created_at).getTime()
              : 0;

            return dateB - dateA;
          });

          if (isActive) {
            setOrders(allOrders.slice(0, 3));
            setDesigns((designsResult.data || []) as Design[]);
          }
        } catch (error) {
          console.error('Home data loading error:', error);
        } finally {
          if (isActive) {
            setLoadingOrders(false);
            setLoadingDesigns(false);
          }
        }
      };

      setLoadingOrders(true);
      setLoadingDesigns(true);

      void fetchHomeData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Pink Blush</Text>
            <Text style={styles.welcome}>Welcome to your style space!</Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color="#d96b8a"
            />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Introduction */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>
            Your Style. Your Fit. Your Way.
          </Text>

          <Text style={styles.introDescription}>
            From everyday essentials to custom-made outfits, bring your
            ideas to life with garments made just for you.
          </Text>

          <View style={styles.introHighlight}>
            <Text style={styles.introHighlightText}>
              Designed with care, made to fit you.
            </Text>
          </View>
        </View>

        {/* Ordering Buttons */}
        <View style={styles.orderingButtons}>
          <TouchableOpacity
            style={styles.customOrderButton}
            onPress={() => navigation.navigate('CustomOrder')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonTextContainer}>
              <Text style={styles.customOrderButtonTitle}>
                Create Your Own Outfit
              </Text>

              <Text style={styles.customOrderButtonSubtitle}>
                Turn your inspiration into reality
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-circle"
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.catalogButton}
            onPress={() => navigation.navigate('Catalog')}
            activeOpacity={0.85}
          >
            <View style={styles.buttonTextContainer}>
              <Text style={styles.catalogButtonTitle}>
                Explore Our Collection
              </Text>

              <Text style={styles.catalogButtonSubtitle}>
                Find a style you'll love
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-circle"
              size={28}
              color="#D96B8A"
            />
          </TouchableOpacity>
        </View>

        {/* Recent Order Updates */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your Order Updates
            </Text>

            <Text style={styles.sectionSubtitle}>
              Stay updated on your garment orders
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loadingOrders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D96B8A" />
            <Text style={styles.loadingText}>
              Loading your orders...
            </Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Your Next Favorite Outfit Starts Here!
            </Text>

            <Text style={styles.emptyText}>
              You haven't placed an order yet. Explore our collection
              or create a custom outfit that matches your style.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Catalog')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>
                Start Exploring
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={`${order.orderType}-${order.id}`}
              style={styles.orderCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Orders')}
            >
              <View style={styles.orderTopRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderType}>
                    {order.orderType} Order
                  </Text>

                  <Text style={styles.orderId}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${getStatusColor(order.status)}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {formatStatus(order.status)}
                  </Text>
                </View>
              </View>

              {order.description ? (
                <Text
                  style={styles.orderDescription}
                  numberOfLines={2}
                >
                  {order.description}
                </Text>
              ) : null}

              {/* Latest Production Tracking Update */}
              <View style={styles.productionUpdateContainer}>
                <View style={styles.productionUpdateHeader}>
                  <Ionicons
                    name="shirt-outline"
                    size={15}
                    color="#D96B8A"
                  />

                  <Text style={styles.productionUpdateTitle}>
                    Production Tracking
                  </Text>
                </View>

                {order.productionStatus ? (
                  <View style={styles.productionUpdateContent}>
                    <View style={styles.productionStatusRow}>
                      <View style={styles.productionDot} />

                      <Text style={styles.productionStatusText}>
                        {formatStatus(order.productionStatus)}
                      </Text>
                    </View>

                    <View style={styles.productionDateRow}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color="#999"
                      />

                      <Text style={styles.productionDateText}>
                        Last updated: {formatDateTime(
                          order.productionUpdatedAt || null
                        )}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.productionPendingText}>
                    Production tracking has not started yet.
                  </Text>
                )}
              </View>

              <View style={styles.orderBottomRow}>
                <View style={styles.dateTimeContainer}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color="#999"
                  />

                  <Text style={styles.orderDate}>
                    {formatDateTime(order.created_at)}
                  </Text>
                </View>

                <Text style={styles.viewDetailsText}>
                  View Details →
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Featured Designs */}
        <View style={styles.designSectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Find Your Inspiration
            </Text>

            <Text style={styles.sectionSubtitle}>
              Discover designs you'll love
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={styles.viewAllText}>Explore</Text>
          </TouchableOpacity>
        </View>

        {loadingDesigns ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D96B8A" />
            <Text style={styles.loadingText}>
              Discovering beautiful designs...
            </Text>
          </View>
        ) : designs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Something Beautiful Is Coming!
            </Text>

            <Text style={styles.emptyText}>
              Our featured designs will appear here. In the meantime,
              explore our available garments.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Catalog')}
            >
              <Text style={styles.emptyButtonText}>
                Browse Collection
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.designScrollContent}
          >
            {designs.map((design) => (
              <TouchableOpacity
                key={design.id}
                style={styles.designCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Catalog')}
              >
                {design.image_url ? (
                  <Image
                    source={{ uri: design.image_url }}
                    style={styles.designImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.designFallback}>
                    <Ionicons
                      name="shirt-outline"
                      size={38}
                      color="#D96B8A"
                    />

                    <Text style={styles.fallbackBrand}>
                      PINK BLUSH
                    </Text>

                    <Text style={styles.fallbackLabel}>
                      Made for Your Style
                    </Text>
                  </View>
                )}

                <View style={styles.designInfo}>
                  <Text
                    style={styles.designName}
                    numberOfLines={1}
                  >
                    {design.name}
                  </Text>

                  {design.description ? (
                    <Text
                      style={styles.designDescription}
                      numberOfLines={2}
                    >
                      {design.description}
                    </Text>
                  ) : null}

                  <Text style={styles.designExplore}>
                    Discover This Design →
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Bottom Promotion */}
        <View style={styles.promoSection}>
          <Ionicons name="heart" size={21} color="#D96B8A" />

          <Text style={styles.promoTitle}>
            Made for You, Made with Care.
          </Text>

          <Text style={styles.promoDescription}>
            Your perfect outfit is only a few steps away. Let's create
            something you'll love wearing.
          </Text>

          <TouchableOpacity
            style={styles.promoButton}
            onPress={() => navigation.navigate('CustomOrder')}
            activeOpacity={0.85}
          >
            <Text style={styles.promoButtonText}>
              Design Your Outfit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pink Blush • Made with love
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 110,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 25,
  },

  brand: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#D96B8A',
  },

  welcome: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FCE8EE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E5484D',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  introSection: {
    marginBottom: 22,
  },

  introTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 9,
  },

  introDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#777',
  },

  introHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },

  introHighlightText: {
    color: '#D96B8A',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 7,
  },

  orderingButtons: {
    gap: 12,
    marginBottom: 32,
  },

  customOrderButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 14,
    paddingHorizontal: 17,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  buttonTextContainer: {
    flex: 1,
    marginRight: 10,
  },

  customOrderButtonTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  customOrderButtonSubtitle: {
    color: '#FCE8EE',
    fontSize: 11,
    marginTop: 5,
  },

  catalogButton: {
    backgroundColor: '#FCE8EE',
    borderRadius: 14,
    paddingHorizontal: 17,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3D1DC',
  },

  catalogButtonTitle: {
    color: '#B84470',
    fontSize: 15,
    fontWeight: 'bold',
  },

  catalogButtonSubtitle: {
    color: '#A77B89',
    fontSize: 11,
    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  designSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },

  viewAllText: {
    color: '#D96B8A',
    fontSize: 12,
    fontWeight: 'bold',
  },

  loadingContainer: {
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#999',
    fontSize: 12,
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: '#FDF3F6',
    borderRadius: 15,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5E1E8',
  },

  emptyTitle: {
    color: '#444',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },

  emptyText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },

  emptyButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },

  emptyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 13,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1D9E0',
  },

  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  orderInfo: {
    flex: 1,
    marginRight: 8,
  },

  orderType: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },

  orderId: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 130,
  },

  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  orderDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  productionUpdateContainer: {
    backgroundColor: '#FDF3F6',
    borderRadius: 10,
    padding: 12,
    marginTop: 13,
    borderWidth: 1,
    borderColor: '#F5E1E8',
  },

  productionUpdateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  productionUpdateTitle: {
    color: '#B84470',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
  },

  productionUpdateContent: {
    paddingLeft: 3,
  },

  productionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D96B8A',
    marginRight: 8,
  },

  productionStatusText: {
    color: '#444',
    fontSize: 12,
    fontWeight: 'bold',
  },

  productionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    marginLeft: 16,
  },

  productionDateText: {
    color: '#999',
    fontSize: 10,
    marginLeft: 5,
    flexShrink: 1,
  },

  productionPendingText: {
    color: '#999',
    fontSize: 11,
    marginLeft: 3,
  },

  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5E8EC',
    marginTop: 13,
    paddingTop: 11,
  },

  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  orderDate: {
    color: '#999',
    fontSize: 10,
    marginLeft: 5,
    flexShrink: 1,
  },

  viewDetailsText: {
    color: '#D96B8A',
    fontSize: 11,
    fontWeight: 'bold',
  },

  designScrollContent: {
    paddingRight: 5,
    paddingBottom: 5,
  },

  designCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 13,
    borderWidth: 1,
    borderColor: '#F1D9E0',
  },

  designImage: {
    width: '100%',
    height: 175,
    backgroundColor: '#FCE8EE',
  },

  designFallback: {
    width: '100%',
    height: 175,
    backgroundColor: '#FCE8EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackBrand: {
    color: '#D96B8A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 8,
  },

  fallbackLabel: {
    color: '#B87B8D',
    fontSize: 10,
    marginTop: 4,
  },

  designInfo: {
    padding: 12,
  },

  designName: {
    color: '#333',
    fontSize: 13,
    fontWeight: 'bold',
  },

  designDescription: {
    color: '#888',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  designExplore: {
    color: '#D96B8A',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
  },

  promoSection: {
    backgroundColor: '#FDF1F5',
    borderRadius: 16,
    padding: 21,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#F5DFE7',
  },

  promoTitle: {
    color: '#B84470',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },

  promoDescription: {
    color: '#8C727B',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },

  promoButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },

  promoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 10,
  },

  footerText: {
    color: '#B99BA5',
    fontSize: 11,
  },
});
