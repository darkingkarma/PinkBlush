
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
import { supabase } from '../../../supabase';

type OrderType = 'all' | 'catalog' | 'custom';

type CustomOrder = {
  id: string;
  reference_image_url: string | null;
  garment_description: string;
  special_instructions: string | null;
  status: string;
  quoted_price: number | string | null;
  deposit_amount: number | string | null;
  quotation_note: string | null;
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
};

type DisplayOrder =
  | { type: 'custom'; data: CustomOrder }
  | { type: 'catalog'; data: CatalogOrder };

type DesignInfo = {
  id: string;
  name: string;
  image_url: string | null;
};

const STATUS_INFO: Record<
  string,
  { label: string; color: string; background: string }
> = {
  submitted: {
    label: 'Request Submitted',
    color: '#946200',
    background: '#FFF3CD',
  },
  under_review: {
    label: 'Under Review',
    color: '#2456A6',
    background: '#E7F0FF',
  },
  quoted: {
    label: 'Quotation Ready',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  quotation_sent: {
    label: 'Quotation Ready',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  accepted: {
    label: 'Quotation Accepted',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  measurements_pending: {
    label: 'Measurements Needed',
    color: '#2456A6',
    background: '#E7F0FF',
  },
  awaiting_deposit: {
    label: 'Awaiting Deposit',
    color: '#946200',
    background: '#FFF3CD',
  },
  deposit_paid: {
    label: 'Deposit Paid',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  pending: {
    label: 'Pending Review',
    color: '#946200',
    background: '#FFF3CD',
  },
  in_production: {
    label: 'In Production',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  ready_for_fitting: {
    label: 'Ready for Fitting',
    color: '#2456A6',
    background: '#E7F0FF',
  },
  ready_for_release: {
    label: 'Ready for Pickup',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  completed: {
    label: 'Completed',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  declined: {
    label: 'Quotation Declined',
    color: '#B42335',
    background: '#FCE8EA',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#666666',
    background: '#EEEEEE',
  },
};

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusInfo = (status: string) =>
  STATUS_INFO[status.toLowerCase()] || {
    label: formatStatus(status),
    color: '#555555',
    background: '#EEEEEE',
  };

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatPrice = (
  amount: number | string | null | undefined,
) => {
  if (amount === null || amount === undefined || amount === '') {
    return null;
  }

  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return null;
  }

  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [filter, setFilter] = useState<OrderType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(
    null,
  );

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
            'id, reference_image_url, garment_description, special_instructions, status, quoted_price, deposit_amount, quotation_note, created_at',
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

      const catalogRows = (catalogData || []) as Omit<
        CatalogOrder,
        'items'
      >[];

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

      const uniqueIds = (
        values: (string | null | undefined)[],
      ) => [
        ...new Set(
          values.filter(
            (value): value is string => !!value,
          ),
        ),
      ];

      const garmentIds = uniqueIds(
        rawItems.map((item) => item.garment_id),
      );

      const partIds = uniqueIds(
        rawItems.map((item) => item.garment_part_id),
      );

      const designIds = uniqueIds(
        rawItems.map((item) => item.design_id),
      );

      const fabricIds = uniqueIds(
        rawItems.map((item) => item.fabric_id),
      );

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
          console.warn(
            `Unable to load ${table} names:`,
            error.message,
          );
          return {};
        }

        return Object.fromEntries(
          (data || []).map(
            (row: { id: string; name: string }) => [
              row.id,
              row.name,
            ],
          ),
        );
      };

      const fetchDesigns = async (
        ids: string[],
      ): Promise<Record<string, DesignInfo>> => {
        if (ids.length === 0) return {};

        const { data, error } = await supabase
          .from('designs')
          .select('id, name, image_url')
          .in('id', ids);

        if (error) {
          console.warn(
            'Unable to load design images:',
            error.message,
          );

          const names = await fetchNames('designs', ids);

          return Object.fromEntries(
            Object.entries(names).map(([id, name]) => [
              id,
              {
                id,
                name,
                image_url: null,
              },
            ]),
          );
        }

        return Object.fromEntries(
          ((data || []) as DesignInfo[]).map((design) => [
            design.id,
            design,
          ]),
        );
      };

      const [
        garmentNames,
        partNames,
        designs,
        fabricNames,
      ] = await Promise.all([
        fetchNames('garments', garmentIds),
        fetchNames('garment_parts', partIds),
        fetchDesigns(designIds),
        fetchNames('fabrics', fabricIds),
      ]);

      const itemsWithNames: CatalogOrderItem[] = rawItems.map(
        (item) => {
          const design = item.design_id
            ? designs[item.design_id]
            : undefined;

          return {
            ...item,
            garmentName: garmentNames[item.garment_id],
            partName: partNames[item.garment_part_id],
            designName: design?.name,
            designImageUrl: design?.image_url || null,
            fabricName: item.fabric_id
              ? fabricNames[item.fabric_id]
              : undefined,
          };
        },
      );

      const catalogOrders: CatalogOrder[] = catalogRows.map(
        (order) => ({
          ...order,
          items: itemsWithNames.filter(
            (item) => item.order_id === order.id,
          ),
        }),
      );

      // Generate signed URLs for private custom-order images.
      const customOrdersWithImages = await Promise.all(
        customRows.map(async (order) => {
          const storedValue = order.reference_image_url?.trim();

          if (!storedValue) {
            return {
              ...order,
              signedImageUrl: null,
            };
          }

          try {
            let imagePath = storedValue;

            if (
              imagePath.startsWith('http://') ||
              imagePath.startsWith('https://')
            ) {
              const parsedUrl = new URL(imagePath);
              const marker = '/storage/v1/object/';
              const markerIndex =
                parsedUrl.pathname.indexOf(marker);

              if (markerIndex !== -1) {
                let storagePath = parsedUrl.pathname.slice(
                  markerIndex + marker.length,
                );

                storagePath = storagePath.replace(
                  /^(public|sign|authenticated)\//,
                  '',
                );

                const bucketPrefix = 'custom-order-images/';

                if (storagePath.startsWith(bucketPrefix)) {
                  imagePath = storagePath.slice(
                    bucketPrefix.length,
                  );
                } else {
                  imagePath = storagePath;
                }

                imagePath = decodeURIComponent(imagePath);
              } else {
                return {
                  ...order,
                  signedImageUrl: imagePath,
                };
              }
            }

            imagePath = imagePath.replace(
              /^\/?custom-order-images\//,
              '',
            );

            const { data, error } = await supabase.storage
              .from('custom-order-images')
              .createSignedUrl(imagePath, 60 * 60);

            if (error) {
              console.error(
                `Custom order image error (${order.id}):`,
                error.message,
                'Path:',
                imagePath,
              );

              return {
                ...order,
                signedImageUrl: null,
              };
            }

            return {
              ...order,
              signedImageUrl: data.signedUrl,
            };
          } catch (error: any) {
            console.error(
              `Unable to process image for custom order ${order.id}:`,
              error?.message || error,
            );

            return {
              ...order,
              signedImageUrl: null,
            };
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
        error?.message ||
          'Please check your connection and try again.',
      );
    }
  }, []);

  const respondToQuotation = (
    order: CustomOrder,
    decision: 'accepted' | 'declined',
  ) => {
    const isAccepting = decision === 'accepted';

    Alert.alert(
      isAccepting ? 'Accept Quotation?' : 'Decline Quotation?',
      isAccepting
        ? 'Do you agree to the quoted price and required deposit?'
        : 'Are you sure you want to decline this quotation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: isAccepting ? 'Accept' : 'Decline',
          style: isAccepting ? 'default' : 'destructive',
          onPress: async () => {
            setSavingOrderId(order.id);

            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError) throw userError;

              if (!user) {
                Alert.alert(
                  'Login Required',
                  'Please log in again.',
                );
                return;
              }

              const { data, error } = await supabase
                .from('custom_orders')
                .update({ status: decision })
                .eq('id', order.id)
                .eq('user_id', user.id)
                .in('status', ['quoted', 'quotation_sent'])
                .select('id, status')
                .maybeSingle();

              if (error) throw error;

              if (!data) {
                Alert.alert(
                  'Unable to Update',
                  'This quotation may already have been answered, or your account does not have permission to update it. Refresh your orders and try again.',
                );

                await fetchOrders();
                return;
              }

              await fetchOrders();

              Alert.alert(
                isAccepting
                  ? 'Quotation Accepted'
                  : 'Quotation Declined',
                isAccepting
                  ? 'You accepted the quotation. Please follow the next instructions for your measurements and deposit.'
                  : 'You declined the quotation. Contact staff if you want to discuss a different quotation.',
              );
            } catch (error: any) {
              Alert.alert(
                'Update Failed',
                error?.message || 'Please try again.',
              );
            } finally {
              setSavingOrderId(null);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    };

    load();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const visibleOrders = orders.filter(
    (order) => filter === 'all' || order.type === filter,
  );

  const renderCustomOrder = (order: CustomOrder) => (
    <>
      <Text style={styles.sectionHeading}>Reference Image</Text>

      {order.signedImageUrl ? (
        <Image
          source={{ uri: order.signedImageUrl }}
          style={styles.referenceImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons
            name="image-outline"
            size={38}
            color="#D96B8A"
          />
          <Text style={styles.placeholderText}>
            {order.reference_image_url
              ? 'Reference image unavailable'
              : 'No reference image uploaded'}
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Garment Description</Text>

      <Text style={styles.description}>
        {order.garment_description}
      </Text>

      {order.special_instructions ? (
        <View style={styles.noteBox}>
          <Text style={styles.smallLabel}>
            Special Instructions
          </Text>
          <Text style={styles.noteText}>
            {order.special_instructions}
          </Text>
        </View>
      ) : null}

      <View style={styles.dateRow}>
        <Text style={styles.smallLabel}>Date submitted</Text>
        <Text style={styles.dateText}>
          {formatDate(order.created_at)}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionHeading}>Quotation Details</Text>

      {formatPrice(order.quoted_price) ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Quoted price</Text>
          <Text style={styles.priceValue}>
            {formatPrice(order.quoted_price)}
          </Text>
        </View>
      ) : (
        <Text style={styles.helperText}>
          Your quotation is not available yet. Staff will review
          your request and prepare a quotation.
        </Text>
      )}

      {formatPrice(order.deposit_amount) ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Required deposit</Text>
          <Text style={styles.depositValue}>
            {formatPrice(order.deposit_amount)}
          </Text>
        </View>
      ) : null}

      {order.quotation_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.smallLabel}>Note from staff</Text>
          <Text style={styles.noteText}>
            {order.quotation_note}
          </Text>
        </View>
      ) : null}

      {['quoted', 'quotation_sent'].includes(
        order.status.toLowerCase(),
      ) && formatPrice(order.quoted_price) ? (
        <View style={styles.quotationActions}>
          <Text style={styles.nextStep}>
            Review the quoted price and required deposit. Accept
            if you agree, or decline if you do not.
          </Text>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              savingOrderId !== null && styles.disabledButton,
            ]}
            onPress={() => respondToQuotation(order, 'accepted')}
            disabled={savingOrderId !== null}
          >
            {savingOrderId === order.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  Accept Quotation
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.declineButton,
              savingOrderId !== null && styles.disabledButton,
            ]}
            onPress={() => respondToQuotation(order, 'declined')}
            disabled={savingOrderId !== null}
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color="#B42335"
            />
            <Text style={styles.declineButtonText}>
              Decline Quotation
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {order.status.toLowerCase() === 'accepted' ? (
        <Text style={styles.nextStep}>
          You accepted the quotation. Please coordinate with staff
          regarding measurements and the required deposit before
          production begins.
        </Text>
      ) : null}

      {order.status.toLowerCase() === 'declined' ? (
        <Text style={styles.declinedMessage}>
          You declined this quotation. Please contact staff if you
          would like to discuss another quotation.
        </Text>
      ) : null}
    </>
  );

  const renderCatalogOrder = (order: CatalogOrder) => (
    <>
      <View style={styles.dateRow}>
        <Text style={styles.smallLabel}>Date ordered</Text>
        <Text style={styles.dateText}>
          {formatDate(order.created_at)}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionHeading}>Garment Details</Text>

      {order.items.length === 0 ? (
        <Text style={styles.helperText}>
          No item details are available for this order.
        </Text>
      ) : (
        order.items.map((item, index) => (
          <View
            key={item.id || `${order.id}-${index}`}
            style={styles.itemBox}
          >
            <Text style={styles.itemTitle}>
              {item.garmentName || 'Garment'}
            </Text>

            <Text style={styles.itemDetail}>
              Part: {item.partName || 'Part details unavailable'}
            </Text>

            <View style={styles.designSection}>
              <Text style={styles.designHeading}>
                Selected Design
              </Text>

              {item.designImageUrl ? (
                <Image
                  source={{ uri: item.designImageUrl }}
                  style={styles.designImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.designPlaceholder}>
                  <Ionicons
                    name="shirt-outline"
                    size={32}
                    color="#D96B8A"
                  />
                  <Text style={styles.placeholderText}>
                    No design image available
                  </Text>
                </View>
              )}

              <Text style={styles.designName}>
                {item.designName || 'Not specified'}
              </Text>
            </View>

            <Text style={styles.itemDetail}>
              Fabric: {item.fabricName || 'Not specified'}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Quantity: {item.quantity}
              </Text>
              <Text style={styles.priceLabel}>
                Unit: {formatPrice(item.unit_price) || '—'}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>
                {formatPrice(item.subtotal) || '—'}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Order Total</Text>
        <Text style={styles.totalValue}>
          {formatPrice(order.total_amount) || '—'}
        </Text>
      </View>

      <Text style={styles.helperText}>
        Keep your order reference for inquiries. Payment and
        production updates will appear here when your order status
        is updated.
      </Text>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D96B8A" />
        <Text style={styles.loadingText}>
          Loading your orders...
        </Text>
      </View>
    );
  }

  const catalogCount = orders.filter(
    (order) => order.type === 'catalog',
  ).length;

  const customCount = orders.filter(
    (order) => order.type === 'custom',
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#D96B8A"
          colors={['#D96B8A']}
        />
      }
    >
      <Text style={styles.heading}>My Orders</Text>

      <Text style={styles.subtitle}>
        Track your catalog purchases and custom garment requests
        in one place.
      </Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>All Orders</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{catalogCount}</Text>
          <Text style={styles.summaryLabel}>Catalog</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{customCount}</Text>
          <Text style={styles.summaryLabel}>Custom</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {([
          { key: 'all', label: 'All' },
          { key: 'catalog', label: 'Catalog' },
          { key: 'custom', label: 'Custom' },
        ] as const).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(item.key)}
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
          <Ionicons
            name="receipt-outline"
            size={48}
            color="#D96B8A"
          />

          <Text style={styles.emptyTitle}>
            {filter === 'all'
              ? 'No orders yet'
              : filter === 'catalog'
                ? 'No catalog orders yet'
                : 'No custom requests yet'}
          </Text>

          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Your catalog orders and custom garment requests will appear here.'
              : filter === 'catalog'
                ? 'Orders submitted through the product catalog will appear here.'
                : 'Your custom garment requests will appear here after you submit them.'}
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              Refresh Orders
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        visibleOrders.map((order) => {
          const data = order.data;
          const status = getStatusInfo(data.status);

          return (
            <View
              key={`${order.type}-${data.id}`}
              style={styles.orderCard}
            >
              <View style={styles.cardTop}>
                <View style={styles.orderNumberContainer}>
                  <Text style={styles.orderLabel}>
                    {order.type === 'catalog'
                      ? 'CATALOG ORDER'
                      : 'CUSTOM REQUEST'}
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
                  <Text
                    style={[
                      styles.statusText,
                      { color: status.color },
                    ]}
                  >
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

      <Text style={styles.footer}>
        Pull down to refresh your order information.
      </Text>
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
    backgroundColor: '#FFF8FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 14,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#B84470',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    lineHeight: 21,
    marginBottom: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FCE7EF',
    padding: 13,
    borderRadius: 13,
  },
  summaryNumber: {
    color: '#B84470',
    fontSize: 25,
    fontWeight: '700',
  },
  summaryLabel: {
    color: '#684754',
    fontSize: 11,
    marginTop: 3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: '#F2E6EB',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#D96B8A',
  },
  filterText: {
    color: '#684754',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0DFE6',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  orderNumberContainer: {
    flex: 1,
  },
  orderLabel: {
    color: '#999',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  orderNumber: {
    color: '#B84470',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 10,
    maxWidth: '60%',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  referenceImage: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F5E5EC',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
  },
  placeholderText: {
    color: '#94677A',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    color: '#B84470',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: '#333',
    fontSize: 14,
    lineHeight: 21,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  smallLabel: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#555',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E2E7',
    marginVertical: 16,
  },
  sectionHeading: {
    color: '#333',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  noteBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  noteText: {
    color: '#444',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  priceLabel: {
    color: '#666',
    fontSize: 13,
  },
  priceValue: {
    color: '#B84470',
    fontSize: 16,
    fontWeight: '700',
  },
  depositValue: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: '#777',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  nextStep: {
    color: '#8A4B67',
    backgroundColor: '#FFF0F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  quotationActions: {
    marginTop: 12,
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#237A4B',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0B8BF',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  declineButtonText: {
    color: '#B42335',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  declinedMessage: {
    color: '#B42335',
    backgroundColor: '#FCE8EA',
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  itemBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 11,
    padding: 12,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B84470',
    marginBottom: 7,
  },
  itemDetail: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 5,
  },
  designSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  designHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#684754',
    marginBottom: 8,
  },
  designImage: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    backgroundColor: '#F5E5EC',
  },
  designPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#FCE7EF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  designName: {
    color: '#B84470',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  totalBox: {
    backgroundColor: '#FCE7EF',
    borderRadius: 11,
    padding: 14,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#684754',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B84470',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F0DFE6',
  },
  emptyTitle: {
    color: '#B84470',
    fontSize: 18,
    fontWeight: '700',
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
    backgroundColor: '#D96B8A',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
