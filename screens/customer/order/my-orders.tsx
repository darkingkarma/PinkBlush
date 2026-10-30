import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../navigator';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type OrderType = 'all' | 'catalog' | 'custom';

type CustomOrder = {
  id: string;
  reference_image_url: string | null;
  garment_description: string;
  status: string;
  quoted_price: number | string | null;
  estimated_completion_date: string | null;
  created_at: string;
  signedImageUrl?: string | null;
};

type CatalogOrderItem = {
  id: string;
  order_id: string;
  garment_id: string;
  garment_part_id: string;
  design_id: string | null;
  fabric_id: string | null;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  garmentName?: string;
  garmentImageUrl?: string | null;
  partName?: string;
  designName?: string;
  designImageUrl?: string | null;
  fabricName?: string;
};

type CatalogOrder = {
  id: string;
  status: string;
  total_amount: number | string;
  created_at: string;
  items: CatalogOrderItem[];
  depositPaymentId?: string | null;
};

type DisplayOrder =
  | { type: 'custom'; data: CustomOrder }
  | { type: 'catalog'; data: CatalogOrder };

type GarmentInfo = {
  id: string;
  name: string;
  image_url: string | null;
};

type DesignInfo = {
  id: string;
  name: string;
  image_url: string | null;
};

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';

const STATUS_INFO: Record<
  string,
  { label: string; color: string; background: string }
> = {
  submitted: { label: 'Request Submitted', color: '#946200', background: '#FFF3CD' },
  under_review: { label: 'Under Review', color: '#2456A6', background: '#E7F0FF' },
  quoted: { label: 'Quotation Ready', color: '#7A3DB8', background: '#F2E7FF' },
  quotation_sent: { label: 'Quotation Ready', color: '#7A3DB8', background: '#F2E7FF' },
  accepted: { label: 'Quotation Accepted', color: '#237A4B', background: '#E1F6E9' },
  measurements_pending: { label: 'Measurements Needed', color: '#2456A6', background: '#E7F0FF' },
  awaiting_deposit: { label: 'Awaiting Deposit', color: '#946200', background: '#FFF3CD' },
  deposit_paid: { label: 'Deposit Paid', color: '#237A4B', background: '#E1F6E9' },
  pending: { label: 'Pending Review', color: '#946200', background: '#FFF3CD' },
  in_production: { label: 'In Production', color: '#7A3DB8', background: '#F2E7FF' },
  ready_for_fitting: { label: 'Ready for Fitting', color: '#2456A6', background: '#E7F0FF' },
  ready_for_release: { label: 'Ready for Pickup', color: '#237A4B', background: '#E1F6E9' },
  completed: { label: 'Completed', color: '#237A4B', background: '#E1F6E9' },
  declined: { label: 'Request Declined', color: '#B42335', background: '#FCE8EA' },
  cancelled: { label: 'Cancelled', color: '#666666', background: '#EEEEEE' },
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not specified';

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatPrice = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined || amount === '') return null;

  const value = Number(amount);
  if (!Number.isFinite(value)) return null;

  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusInfo = (status: string) =>
  STATUS_INFO[status.toLowerCase()] || {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    color: '#555555',
    background: '#EEEEEE',
  };

const getUniqueIds = (values: (string | null | undefined)[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

export default function MyOrdersScreen() {
  const navigation = useNavigation<Navigation>();

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [filter, setFilter] = useState<OrderType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const openOrderDetails = (
    orderId: string,
    orderType: 'custom' | 'catalog',
  ) => {
    navigation.navigate('OrderDetails', { orderId, orderType });
  };

  const fetchOrders = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setOrders([]);
        return;
      }

      const [
        { data: customData, error: customError },
        { data: catalogData, error: catalogError },
      ] = await Promise.all([
        supabase
          .from('custom_orders')
          .select(
            'id, reference_image_url, garment_description, status, quoted_price, estimated_completion_date, created_at',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (customError) throw customError;
      if (catalogError) throw catalogError;

      const customRows = (customData || []) as CustomOrder[];
      const catalogRows = (catalogData || []) as Omit<CatalogOrder, 'items' | 'depositPaymentId'>[];

      const catalogIds = catalogRows.map((order) => order.id);
      let rawItems: CatalogOrderItem[] = [];

      if (catalogIds.length > 0) {
        const { data, error } = await supabase
          .from('order_items')
          .select(
            'id, order_id, garment_id, garment_part_id, design_id, fabric_id, quantity, unit_price, subtotal',
          )
          .in('order_id', catalogIds);

        if (error) throw error;
        rawItems = (data || []) as CatalogOrderItem[];
      }

      const garmentIds = getUniqueIds(rawItems.map((item) => item.garment_id));
      const partIds = getUniqueIds(rawItems.map((item) => item.garment_part_id));
      const designIds = getUniqueIds(rawItems.map((item) => item.design_id));
      const fabricIds = getUniqueIds(rawItems.map((item) => item.fabric_id));

      const fetchNames = async (
        table: string,
        ids: string[],
      ): Promise<Record<string, string>> => {
        if (ids.length === 0) return {};

        const { data, error } = await supabase
          .from(table)
          .select('id, name')
          .in('id', ids);

        if (error) {
          console.warn(`Unable to load ${table} names:`, error.message);
          return {};
        }

        return Object.fromEntries(
          (data || []).map((row: { id: string; name: string }) => [
            row.id,
            row.name,
          ]),
        );
      };

      const fetchGarments = async (): Promise<Record<string, GarmentInfo>> => {
        if (garmentIds.length === 0) return {};

        const { data, error } = await supabase
          .from('garments')
          .select('id, name, image_url')
          .in('id', garmentIds);

        if (error) {
          console.warn('Unable to load garment images:', error.message);
          return {};
        }

        return Object.fromEntries(
          ((data || []) as GarmentInfo[]).map((garment) => [
            garment.id,
            garment,
          ]),
        );
      };

      const fetchDesigns = async (): Promise<Record<string, DesignInfo>> => {
        if (designIds.length === 0) return {};

        const { data, error } = await supabase
          .from('designs')
          .select('id, name, image_url')
          .in('id', designIds);

        if (error) {
          console.warn('Unable to load design images:', error.message);
          return {};
        }

        return Object.fromEntries(
          ((data || []) as DesignInfo[]).map((design) => [
            design.id,
            design,
          ]),
        );
      };

      const [garments, partNames, designs, fabricNames] = await Promise.all([
        fetchGarments(),
        fetchNames('garment_parts', partIds),
        fetchDesigns(),
        fetchNames('fabrics', fabricIds),
      ]);

      const itemsWithNames = rawItems.map((item) => {
        const garment = garments[item.garment_id];
        const design = item.design_id ? designs[item.design_id] : undefined;

        return {
          ...item,
          garmentName: garment?.name,
          garmentImageUrl: garment?.image_url || null,
          partName: partNames[item.garment_part_id],
          designName: design?.name,
          designImageUrl: design?.image_url || null,
          fabricName: item.fabric_id ? fabricNames[item.fabric_id] : undefined,
        };
      });

      // Find existing paid deposit records. Do not create new payments here.
      const depositPaymentIds: Record<string, string> = {};

      if (catalogIds.length > 0) {
        const { data: paymentRows, error: paymentError } = await supabase
          .from('payments')
          .select('id, order_id, payment_type, status, created_at')
          .in('order_id', catalogIds)
          .eq('payment_type', 'deposit')
          .eq('status', 'paid')
          .order('created_at', { ascending: false });

        if (paymentError) {
          console.warn(
            'Unable to load deposit payments:',
            paymentError.message,
          );
        } else {
          for (const payment of paymentRows || []) {
            if (!depositPaymentIds[payment.order_id]) {
              depositPaymentIds[payment.order_id] = payment.id;
            }
          }
        }
      }

      const catalogOrders: CatalogOrder[] = catalogRows.map((order) => ({
        ...order,
        items: itemsWithNames.filter((item) => item.order_id === order.id),
        depositPaymentId: depositPaymentIds[order.id] || null,
      }));

      const customOrdersWithImages = await Promise.all(
        customRows.map(async (order) => {
          const storedValue = order.reference_image_url?.trim();

          if (!storedValue) return { ...order, signedImageUrl: null };

          try {
            let imagePath = storedValue;

            if (/^https?:\/\//i.test(imagePath)) {
              const parsedUrl = new URL(imagePath);
              const marker = '/storage/v1/object/';
              const markerIndex = parsedUrl.pathname.indexOf(marker);

              if (markerIndex !== -1) {
                let storagePath = parsedUrl.pathname.slice(
                  markerIndex + marker.length,
                );

                storagePath = storagePath.replace(
                  /^(public|sign|authenticated)\//,
                  '',
                );

                const bucketPrefix = 'custom-order-images/';

                imagePath = storagePath.startsWith(bucketPrefix)
                  ? storagePath.slice(bucketPrefix.length)
                  : storagePath;

                imagePath = decodeURIComponent(imagePath);
              } else {
                return { ...order, signedImageUrl: imagePath };
              }
            }

            imagePath = imagePath.replace(/^\/?custom-order-images\//, '');

            const { data, error } = await supabase.storage
              .from('custom-order-images')
              .createSignedUrl(imagePath, 60 * 60);

            if (error) {
              console.warn(`Image unavailable for ${order.id}:`, error.message);
              return { ...order, signedImageUrl: null };
            }

            return { ...order, signedImageUrl: data.signedUrl };
          } catch (error: any) {
            console.warn('Unable to process custom order image:', error?.message);
            return { ...order, signedImageUrl: null };
          }
        }),
      );

      const combined: DisplayOrder[] = [
        ...customOrdersWithImages.map((data) => ({
          type: 'custom' as const,
          data,
        })),
        ...catalogOrders.map((data) => ({
          type: 'catalog' as const,
          data,
        })),
      ];

      combined.sort(
        (a, b) =>
          new Date(b.data.created_at).getTime() -
          new Date(a.data.created_at).getTime(),
      );

      setOrders(combined);
    } catch (error: any) {
      console.error('My Orders error:', error);
      Alert.alert(
        'Unable to load orders',
        error?.message || 'Please check your connection and try again.',
      );
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchOrders();
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const visibleOrders = orders.filter(
    (order) => filter === 'all' || order.type === filter,
  );

  const renderCustomOrder = (order: CustomOrder) => {
    const status = order.status.toLowerCase();
    const quotedPrice = Number(order.quoted_price);

    const hasQuote =
      order.quoted_price !== null &&
      order.quoted_price !== '' &&
      Number.isFinite(quotedPrice);

    const canReviewQuotation =
      ['quoted', 'quotation_sent'].includes(status) && hasQuote;

    return (
      <>
        <View style={styles.productRow}>
          <View style={styles.productInfo}>
            <Text style={styles.orderDescription} numberOfLines={3}>
              {order.garment_description || 'Custom garment request'}
            </Text>

            <Text style={styles.mutedText}>
              Submitted {formatDate(order.created_at)}
            </Text>

            {hasQuote ? (
              <Text style={styles.priceText}>
                {formatPrice(order.quoted_price)}
              </Text>
            ) : (
              <Text style={styles.pendingPrice}>Waiting for quotation</Text>
            )}

            {order.estimated_completion_date &&
            !['declined', 'cancelled'].includes(status) ? (
              <View style={styles.completionInline}>
                <Ionicons name="calendar-outline" size={14} color="#237A4B" />
                <Text style={styles.completionInlineText}>
                  Due {formatDate(order.estimated_completion_date)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.productImageContainer}>
            {order.signedImageUrl ? (
              <Image
                source={{ uri: order.signedImageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="image-outline" size={27} color={PINK} />
                <Text style={styles.smallPlaceholderText}>
                  {order.reference_image_url ? 'Unavailable' : 'No image'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {canReviewQuotation ? (
          <TouchableOpacity
            style={styles.quotationButton}
            onPress={() =>
              navigation.navigate('ReviewQuotation', { orderId: order.id })
            }
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Review Quotation</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => openOrderDetails(order.id, 'custom')}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={18} color={PINK} />
          <Text style={styles.detailsButtonText}>View Order Details</Text>
          <Ionicons name="chevron-forward" size={18} color={PINK} />
        </TouchableOpacity>
      </>
    );
  };

  const renderCatalogOrder = (order: CatalogOrder) => {
    const firstItem = order.items[0];

    return (
      <>
        <View style={styles.productRow}>
          <View style={styles.productInfo}>
            <Text style={styles.orderDescription} numberOfLines={2}>
              {firstItem?.garmentName || 'Catalog Order'}
            </Text>

            {firstItem?.designName ? (
              <Text style={styles.itemSubtitle} numberOfLines={2}>
                Design: {firstItem.designName}
              </Text>
            ) : null}

            {firstItem?.partName ? (
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                Part: {firstItem.partName}
              </Text>
            ) : null}

            <Text style={styles.itemSubtitle}>
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              {firstItem?.quantity ? ` · Qty ${firstItem.quantity}` : ''}
            </Text>

            {firstItem?.fabricName ? (
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                Fabric: {firstItem.fabricName}
              </Text>
            ) : null}

            <Text style={styles.mutedText}>
              Ordered {formatDate(order.created_at)}
            </Text>

            <Text style={styles.priceText}>
              {formatPrice(order.total_amount) || '—'}
            </Text>
          </View>

          <View style={styles.productImageContainer}>
            {firstItem?.garmentImageUrl ? (
              <Image
                source={{ uri: firstItem.garmentImageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="shirt-outline" size={36} color={PINK} />
                <Text style={styles.smallPlaceholderText}>
                  {firstItem?.garmentName || 'Garment'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {order.items.length > 1 ? (
          <Text style={styles.moreItemsText}>
            + {order.items.length - 1} more{' '}
            {order.items.length - 1 === 1 ? 'item' : 'items'} in this order
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => openOrderDetails(order.id, 'catalog')}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={18} color={PINK} />
          <Text style={styles.detailsButtonText}>View Order Details</Text>
          <Ionicons name="chevron-forward" size={18} color={PINK} />
        </TouchableOpacity>

        {order.depositPaymentId ? (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={() =>
              navigation.navigate('Receipt', {
                orderId: order.id,
                paymentId: order.depositPaymentId!,
                orderType: 'catalog',
              })
            }
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
            <Text style={styles.receiptButtonText}>View Receipt</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.mutedText}>Loading your orders...</Text>
      </View>
    );
  }

  const catalogCount = orders.filter((order) => order.type === 'catalog').length;
  const customCount = orders.filter((order) => order.type === 'custom').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={PINK}
          colors={[PINK]}
        />
      }
    >
      <Text style={styles.heading}>My Orders</Text>
      <Text style={styles.subtitle}>
        Track your orders and review your quotations.
      </Text>

      <View style={styles.countRow}>
        <View style={styles.countCard}>
          <Text style={styles.countNumber}>{orders.length}</Text>
          <Text style={styles.countLabel}>All Orders</Text>
        </View>
        <View style={styles.countCard}>
          <Text style={styles.countNumber}>{catalogCount}</Text>
          <Text style={styles.countLabel}>Catalog</Text>
        </View>
        <View style={styles.countCard}>
          <Text style={styles.countNumber}>{customCount}</Text>
          <Text style={styles.countLabel}>Custom</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(
          [
            { key: 'all', label: 'All Orders' },
            { key: 'catalog', label: 'Catalog' },
            { key: 'custom', label: 'Custom' },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(item.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {visibleOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={42} color={PINK} />
          <Text style={styles.emptyTitle}>
            {filter === 'all'
              ? 'No orders yet'
              : filter === 'catalog'
                ? 'No catalog orders yet'
                : 'No custom requests yet'}
          </Text>
          <Text style={styles.emptyText}>
            Your orders and custom garment requests will appear here.
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>Refresh Orders</Text>
          </TouchableOpacity>
        </View>
      ) : (
        visibleOrders.map((order) => {
          const data = order.data;
          const status = getStatusInfo(data.status);

          return (
            <View key={`${order.type}-${data.id}`} style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderType}>
                    {order.type === 'catalog' ? 'CATALOG ORDER' : 'CUSTOM REQUEST'}
                  </Text>
                  <Text style={styles.orderNumber}>
                    #{data.id.slice(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: status.background },
                  ]}
                >
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              {order.type === 'custom'
                ? renderCustomOrder(order.data)
                : renderCatalogOrder(order.data)}
            </View>
          );
        })
      )}

      <Text style={styles.footer}>Pull down to refresh your orders.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF8FA',
  },
  heading: {
    fontSize: 27,
    fontWeight: '800',
    color: DARK_PINK,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#777',
    lineHeight: 20,
    marginBottom: 18,
  },
  countRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  countCard: {
    flex: 1,
    backgroundColor: '#FCE7EF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: DARK_PINK,
  },
  countLabel: {
    fontSize: 11,
    color: '#684754',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#F2E6EB',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: PINK,
  },
  filterText: {
    color: '#684754',
    fontWeight: '600',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0DFE6',
    shadowColor: '#B84470',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  orderType: {
    color: '#999',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  orderNumber: {
    color: DARK_PINK,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 9,
    maxWidth: '55%',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  orderDescription: {
    fontSize: 15,
    lineHeight: 21,
    color: '#333333',
    fontWeight: '700',
    marginBottom: 6,
  },
  itemSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#765D67',
    marginBottom: 4,
  },
  mutedText: {
    color: '#888888',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  priceText: {
    color: DARK_PINK,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 7,
  },
  pendingPrice: {
    color: '#946200',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 7,
  },
  productImageContainer: {
    width: 108,
    height: 124,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF0F5',
    flexShrink: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5E5EC',
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 7,
  },
  smallPlaceholderText: {
    color: '#94677A',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
  completionInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  completionInlineText: {
    color: '#237A4B',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  moreItemsText: {
    color: '#8A6272',
    fontSize: 11,
    marginTop: -3,
    marginBottom: 12,
  },
  quotationButton: {
    backgroundColor: PINK,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 2,
    marginBottom: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#F0D4DF',
    backgroundColor: '#FFFAFC',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  receiptButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    backgroundColor: PINK,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 9,
  },
  receiptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  detailsButtonText: {
    color: DARK_PINK,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0DFE6',
  },
  emptyTitle: {
    color: DARK_PINK,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyText: {
    color: '#777',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  refreshButton: {
    backgroundColor: PINK,
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
});
