import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../../navigator';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type OrderType = 'all' | 'catalog' | 'custom';

type StatusFilter =
  | 'all'
  | 'pending'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'closed';

type CustomStatusFilter =
  | 'all'
  | 'submitted'
  | 'under_review'
  | 'quotation_sent'
  | 'accepted'
  | 'ready_for_fitting'
  | 'ready_for_release'
  | 'declined'
  | 'cancelled';

type CatalogStatusFilter =
  | 'all'
  | 'pending'
  | 'in_production'
  | 'ready_for_release'
  | 'completed'
  | 'cancelled';

type CustomOrder = {
  id: string;
  reference_image_url: string | null;
  garment_description: string;
  status: string;
  quoted_price: number | string | null;
  deposit_amount: number | string | null;
  estimated_completion_date: string | null;
  created_at: string;
  signedImageUrl?: string | null;
  depositPaymentId?: string | null;
  depositPaymentStatus?: string | null;
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
  depositPaymentStatus?: string | null;
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
    label: 'Quotation Sent',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  accepted: {
    label: 'Quotation Accepted',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  pending: {
    label: 'Pending Review',
    color: '#946200',
    background: '#FFF3CD',
  },
  measurements_pending: {
    label: 'Measurements Pending',
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
  in_production: {
    label: 'In Production',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  cutting: {
    label: 'Cutting',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  sewing: {
    label: 'Sewing',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  fitting: {
    label: 'Fitting',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  finishing: {
    label: 'Finishing',
    color: '#7A3DB8',
    background: '#F2E7FF',
  },
  ready_for_fitting: {
    label: 'Ready for Fitting',
    color: '#237A4B',
    background: '#E1F6E9',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    color: '#237A4B',
    background: '#E1F6E9',
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
    label: 'Request Declined',
    color: '#B42335',
    background: '#FCE8EA',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#666666',
    background: '#EEEEEE',
  },
};

const TYPE_FILTERS: { key: OrderType; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'custom', label: 'Custom' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All Statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Cancelled / Declined' },
];

const CUSTOM_STATUS_FILTERS: {
  key: CustomStatusFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All Custom Orders' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'quotation_sent', label: 'Quotation Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'ready_for_fitting', label: 'Ready for Fitting' },
  { key: 'ready_for_release', label: 'Ready for Pickup' },
  { key: 'declined', label: 'Declined' },
  { key: 'cancelled', label: 'Cancelled' },
];

const CATALOG_STATUS_FILTERS: {
  key: CatalogStatusFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All Catalog Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_production', label: 'In Production' },
  { key: 'ready_for_release', label: 'Ready for Pickup' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

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

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
    label: status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    color: '#555555',
    background: '#EEEEEE',
  };

const getStatusGroup = (status: string): StatusFilter => {
  const normalized = status.toLowerCase();

  if (normalized === 'completed') return 'completed';

  if (['cancelled', 'declined'].includes(normalized)) {
    return 'closed';
  }

  if (
    [
      'ready_for_release',
      'ready_for_fitting',
      'ready_for_pickup',
    ].includes(normalized)
  ) {
    return 'ready';
  }

  if (
    [
      'in_production',
      'cutting',
      'sewing',
      'fitting',
      'finishing',
    ].includes(normalized)
  ) {
    return 'in_progress';
  }

  return 'pending';
};

const matchesCustomStatus = (
  actualStatus: string,
  selectedStatus: CustomStatusFilter,
): boolean => {
  const normalized = actualStatus.toLowerCase();

  if (selectedStatus === 'all') return true;

  if (selectedStatus === 'quotation_sent') {
    return ['quotation_sent', 'quoted'].includes(normalized);
  }

  return normalized === selectedStatus;
};

const matchesCatalogStatus = (
  actualStatus: string,
  selectedStatus: CatalogStatusFilter,
): boolean => {
  const normalized = actualStatus.toLowerCase();

  if (selectedStatus === 'all') return true;

  return normalized === selectedStatus;
};

const getUniqueIds = (values: (string | null | undefined)[]) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

export default function MyOrdersScreen() {
  const navigation = useNavigation<Navigation>();
  const { width: screenWidth } = useWindowDimensions();

  const isSmallScreen = screenWidth < 380;
  const horizontalPadding = screenWidth < 600 ? 14 : 24;
  const imageWidth = screenWidth < 380 ? 86 : screenWidth < 600 ? 100 : 120;
  const imageHeight = screenWidth < 380 ? 110 : screenWidth < 600 ? 125 : 145;

  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [filter, setFilter] = useState<OrderType>('all');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customStatusFilter, setCustomStatusFilter] =
    useState<CustomStatusFilter>('all');
  const [catalogStatusFilter, setCatalogStatusFilter] =
    useState<CatalogStatusFilter>('all');

  const [searchQuery, setSearchQuery] = useState('');
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
            'id, reference_image_url, garment_description, status, quoted_price, deposit_amount, estimated_completion_date, created_at',
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
        'items' | 'depositPaymentId' | 'depositPaymentStatus'
      >[];

      const catalogIds = catalogRows.map((order) => order.id);
      const customIds = customRows.map((order) => order.id);

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

      const garmentIds = getUniqueIds(
        rawItems.map((item) => item.garment_id),
      );

      const partIds = getUniqueIds(
        rawItems.map((item) => item.garment_part_id),
      );

      const designIds = getUniqueIds(
        rawItems.map((item) => item.design_id),
      );

      const fabricIds = getUniqueIds(
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

      const fetchGarments = async (): Promise<
        Record<string, GarmentInfo>
      > => {
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

      const fetchDesigns = async (): Promise<
        Record<string, DesignInfo>
      > => {
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

        const design = item.design_id
          ? designs[item.design_id]
          : undefined;

        return {
          ...item,
          garmentName: garment?.name,
          garmentImageUrl: garment?.image_url || null,
          partName: partNames[item.garment_part_id],
          designName: design?.name,
          designImageUrl: design?.image_url || null,
          fabricName: item.fabric_id
            ? fabricNames[item.fabric_id]
            : undefined,
        };
      });

      const depositPaymentIds: Record<string, string> = {};
      const depositPaymentStatuses: Record<string, string> = {};

      if (catalogIds.length > 0) {
        const { data: paymentRows, error: paymentError } = await supabase
          .from('payments')
          .select('id, order_id, payment_type, status, created_at')
          .in('order_id', catalogIds)
          .eq('payment_type', 'deposit')
          .order('created_at', { ascending: false });

        if (paymentError) {
          console.warn(
            'Unable to load catalog deposit payments:',
            paymentError.message,
          );
        } else {
          for (const payment of paymentRows || []) {
            const orderId = payment.order_id;

            if (!orderId) continue;

            const paymentStatus = String(
              payment.status ?? 'pending',
            ).toLowerCase();

            const currentStatus = depositPaymentStatuses[orderId];

            // Keep the newest paid payment, or the newest payment
            // if there is no paid payment for this order yet.
            if (
              !depositPaymentIds[orderId] ||
              (paymentStatus === 'paid' && currentStatus !== 'paid')
            ) {
              depositPaymentIds[orderId] = payment.id;
              depositPaymentStatuses[orderId] = paymentStatus;
            }
          }
        }
      }

      const customDepositPaymentIds: Record<string, string> = {};
      const customDepositPaymentStatuses: Record<string, string> = {};

      if (customIds.length > 0) {
        const { data: paymentRows, error: paymentError } = await supabase
          .from('payments')
          .select('id, custom_order_id, payment_type, status, created_at')
          .in('custom_order_id', customIds)
          .eq('payment_type', 'deposit')
          .order('created_at', { ascending: false });

        if (paymentError) {
          console.warn(
            'Unable to load custom-order deposit payments:',
            paymentError.message,
          );
        } else {
          for (const payment of paymentRows || []) {
            const orderId = payment.custom_order_id;

            if (!orderId) continue;

            const paymentStatus = String(
              payment.status ?? 'pending',
            ).toLowerCase();

            const currentStatus =
              customDepositPaymentStatuses[orderId];

            if (
              !customDepositPaymentIds[orderId] ||
              (paymentStatus === 'paid' && currentStatus !== 'paid')
            ) {
              customDepositPaymentIds[orderId] = payment.id;
              customDepositPaymentStatuses[orderId] = paymentStatus;
            }
          }
        }
      }

      const catalogOrders: CatalogOrder[] = catalogRows.map((order) => ({
        ...order,
        items: itemsWithNames.filter(
          (item) => item.order_id === order.id,
        ),
        depositPaymentId: depositPaymentIds[order.id] || null,
        depositPaymentStatus: depositPaymentStatuses[order.id] || null,
      }));

      const customOrdersWithImages = await Promise.all(
        customRows.map(async (order) => {
          const storedValue = order.reference_image_url?.trim();

          if (!storedValue) {
            return { ...order, signedImageUrl: null };
          }

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

            imagePath = imagePath.replace(
              /^\/?custom-order-images\//,
              '',
            );

            const { data, error } = await supabase.storage
              .from('custom-order-images')
              .createSignedUrl(imagePath, 60 * 60);

            if (error) {
              console.warn(
                `Image unavailable for ${order.id}:`,
                error.message,
              );

              return { ...order, signedImageUrl: null };
            }

            return { ...order, signedImageUrl: data.signedUrl };
          } catch (error: any) {
            console.warn(
              'Unable to process custom order image:',
              error?.message,
            );

            return { ...order, signedImageUrl: null };
          }
        }),
      );

      const customOrdersWithPayments: CustomOrder[] =
        customOrdersWithImages.map((order) => ({
          ...order,
          depositPaymentId: customDepositPaymentIds[order.id] || null,
          depositPaymentStatus:
            customDepositPaymentStatuses[order.id] || null,
        }));

      const combined: DisplayOrder[] = [
        ...customOrdersWithPayments.map((data) => ({
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

  // Refresh whenever the customer returns to this screen.
  // This also refreshes payment status after returning from Payment.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadOrders = async () => {
        if (orders.length === 0) {
          setLoading(true);
        }

        try {
          await fetchOrders();
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadOrders();

      return () => {
        isActive = false;
      };
    }, [fetchOrders, orders.length]),
  );

  // Realtime updates for order records.
  // Payment status is refreshed on screen focus and pull-to-refresh.
  useEffect(() => {
    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToOrderUpdates = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user || !isActive) return;

        const channelName = `my-orders-${user.id}`;

        const existingChannel = supabase
          .getChannels()
          .find((item) => item.topic === `realtime:${channelName}`);

        if (existingChannel) {
          await supabase.removeChannel(existingChannel);
        }

        if (!isActive) return;

        const newChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'custom_orders',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              if (isActive) void fetchOrders();
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `customer_id=eq.${user.id}`,
            },
            () => {
              if (isActive) void fetchOrders();
            },
          );

        channel = newChannel;

        if (isActive) {
          newChannel.subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('My Orders realtime connection error.');
            }

            if (status === 'TIMED_OUT') {
              console.warn('My Orders realtime connection timed out.');
            }
          });
        } else {
          await supabase.removeChannel(newChannel);
        }
      } catch (error) {
        console.error('My Orders realtime setup error:', error);
      }
    };

    void subscribeToOrderUpdates();

    return () => {
      isActive = false;

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (filter !== 'all' && order.type !== filter) {
        return false;
      }

      if (filter === 'custom') {
        if (
          order.type !== 'custom' ||
          !matchesCustomStatus(order.data.status, customStatusFilter)
        ) {
          return false;
        }
      } else if (filter === 'catalog') {
        if (
          order.type !== 'catalog' ||
          !matchesCatalogStatus(order.data.status, catalogStatusFilter)
        ) {
          return false;
        }
      } else {
        if (
          statusFilter !== 'all' &&
          getStatusGroup(order.data.status) !== statusFilter
        ) {
          return false;
        }
      }

      if (!query) return true;

      const orderId = order.data.id.toLowerCase();
      const shortOrderId = orderId.slice(0, 8);

      if (order.type === 'custom') {
        const data = order.data;

        return (
          data.garment_description?.toLowerCase().includes(query) ||
          orderId.includes(query) ||
          shortOrderId.includes(query) ||
          data.status.toLowerCase().includes(query)
        );
      }

      const data = order.data;

      const searchableItems = data.items
        .map((item) =>
          [
            item.garmentName,
            item.partName,
            item.designName,
            item.fabricName,
          ]
            .filter(Boolean)
            .join(' '),
        )
        .join(' ')
        .toLowerCase();

      return (
        orderId.includes(query) ||
        shortOrderId.includes(query) ||
        data.status.toLowerCase().includes(query) ||
        searchableItems.includes(query)
      );
    });
  }, [
    orders,
    filter,
    statusFilter,
    customStatusFilter,
    catalogStatusFilter,
    searchQuery,
  ]);

  const renderCustomOrder = (order: CustomOrder) => {
    const status = order.status.toLowerCase();
    const quotedPrice = Number(order.quoted_price);
    const depositAmount = Number(order.deposit_amount);

    const hasQuote =
      order.quoted_price !== null &&
      order.quoted_price !== '' &&
      Number.isFinite(quotedPrice);

    const hasDepositAmount =
      order.deposit_amount !== null &&
      order.deposit_amount !== '' &&
      Number.isFinite(depositAmount) &&
      depositAmount > 0;

    const canReviewQuotation =
      ['quoted', 'quotation_sent'].includes(status) && hasQuote;

    const canPayDeposit =
      status === 'accepted' &&
      hasDepositAmount &&
      order.depositPaymentStatus !== 'paid';

    return (
      <>
        <View style={styles.productRow}>
          <View style={styles.productInfo}>
            <Text style={styles.orderDescription} numberOfLines={3}>
              {order.garment_description || 'Custom garment request'}
            </Text>

            <Text style={styles.mutedText}>
              Submitted {formatDateTime(order.created_at)}
            </Text>

            {hasQuote ? (
              <Text style={styles.priceText}>
                Quotation: {formatPrice(order.quoted_price)}
              </Text>
            ) : (
              <Text style={styles.pendingPrice}>
                Waiting for quotation
              </Text>
            )}

            {hasDepositAmount ? (
              <Text style={styles.depositText}>
                Deposit: {formatPrice(order.deposit_amount)}
              </Text>
            ) : null}

            {order.estimated_completion_date &&
            !['declined', 'cancelled'].includes(status) ? (
              <View style={styles.completionInline}>
                <Text style={styles.completionInlineText}>
                  Estimated completion:{' '}
                  {formatDate(order.estimated_completion_date)}
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.productImageContainer,
              { width: imageWidth, height: imageHeight },
            ]}
          >
            {order.signedImageUrl ? (
              <Image
                source={{ uri: order.signedImageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.smallPlaceholderText}>
                  {order.reference_image_url
                    ? 'Image unavailable'
                    : 'No image'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {canReviewQuotation ? (
          <TouchableOpacity
            style={styles.quotationButton}
            onPress={() =>
              navigation.navigate('ReviewQuotation', {
                orderId: order.id,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              Review Quotation
            </Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => openOrderDetails(order.id, 'custom')}
          activeOpacity={0.8}
        >
          <Text style={styles.detailsButtonText}>
            View Order Details
          </Text>
          <Text style={styles.detailsArrow}>›</Text>
        </TouchableOpacity>

        {order.depositPaymentStatus === 'paid' &&
        order.depositPaymentId ? (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={() =>
              navigation.navigate('Receipt', {
                orderId: order.id,
                paymentId: order.depositPaymentId!,
                orderType: 'custom',
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.receiptButtonText}>View Receipt</Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>
        ) : canPayDeposit ? (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={() =>
              navigation.navigate('Payment', {
                orderId: order.id,
                orderType: 'custom',
                totalAmount: depositAmount,
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.receiptButtonText}>
              {order.depositPaymentStatus === 'pending'
                ? 'Check Payment'
                : order.depositPaymentStatus === 'failed'
                  ? 'Retry Deposit'
                  : 'Pay Deposit'}
            </Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>
        ) : status === 'accepted' && !hasDepositAmount ? (
          <Text style={styles.paymentNotice}>
            Deposit amount is not available yet. Please contact the staff.
          </Text>
        ) : null}
      </>
    );
  };

  const renderCatalogOrder = (order: CatalogOrder) => {
    const firstItem = order.items[0];
    const catalogStatus = order.status.toLowerCase();

    // Catalog deposit payments are only allowed while the order is pending.
    const canPayCatalogDeposit =
      catalogStatus === 'pending' &&
      order.depositPaymentStatus !== 'paid';

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
              <Text style={styles.itemSubtitle} numberOfLines={2}>
                Part: {firstItem.partName}
              </Text>
            ) : null}

            <Text style={styles.itemSubtitle}>
              {order.items.length}{' '}
              {order.items.length === 1 ? 'item' : 'items'}
              {firstItem?.quantity
                ? ` · Qty ${firstItem.quantity}`
                : ''}
            </Text>

            {firstItem?.fabricName ? (
              <Text style={styles.itemSubtitle} numberOfLines={2}>
                Fabric: {firstItem.fabricName}
              </Text>
            ) : null}

            <Text style={styles.mutedText}>
              Ordered {formatDateTime(order.created_at)}
            </Text>

            <Text style={styles.priceText}>
              {formatPrice(order.total_amount) || '—'}
            </Text>
          </View>

          <View
            style={[
              styles.productImageContainer,
              { width: imageWidth, height: imageHeight },
            ]}
          >
            {firstItem?.garmentImageUrl ? (
              <Image
                source={{ uri: firstItem.garmentImageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
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
          <Text style={styles.detailsButtonText}>
            View Order Details
          </Text>
          <Text style={styles.detailsArrow}>›</Text>
        </TouchableOpacity>

        {order.depositPaymentStatus === 'paid' &&
        order.depositPaymentId ? (
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
            <Text style={styles.receiptButtonText}>View Receipt</Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>
        ) : canPayCatalogDeposit ? (
          <TouchableOpacity
            style={styles.receiptButton}
            onPress={() =>
              navigation.navigate('Payment', {
                orderId: order.id,
                orderType: 'catalog',
                totalAmount: Number(order.total_amount),
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.receiptButtonText}>
              {order.depositPaymentStatus === 'pending'
                ? 'Check Payment'
                : order.depositPaymentStatus === 'failed'
                  ? 'Retry Deposit'
                  : 'Pay Deposit'}
            </Text>
            <Text style={styles.buttonArrow}>›</Text>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: horizontalPadding,
          maxWidth: 940,
          width: '100%',
          alignSelf: 'center',
        },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={PINK}
          colors={[PINK]}
        />
      }
    >
      <Text
        style={[
          styles.heading,
          { fontSize: isSmallScreen ? 23 : 27 },
        ]}
      >
        My Orders
      </Text>

      <Text style={styles.subtitle}>
        Track your orders and review your quotations.
      </Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search garment, design, or order number..."
          placeholderTextColor="#A58D97"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {searchQuery.length > 0 ? (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.filterHeading}>Order Type</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {TYPE_FILTERS.map((item) => (
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
      </ScrollView>

      <Text style={styles.filterHeading}>
        {filter === 'custom'
          ? 'Custom Request Status'
          : filter === 'catalog'
            ? 'Catalog Order Status'
            : 'Order Status'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filter === 'custom'
          ? CUSTOM_STATUS_FILTERS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.statusFilterButton,
                  customStatusFilter === item.key &&
                    styles.statusFilterButtonActive,
                ]}
                onPress={() => setCustomStatusFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    customStatusFilter === item.key &&
                      styles.statusFilterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))
          : filter === 'catalog'
            ? CATALOG_STATUS_FILTERS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.statusFilterButton,
                    catalogStatusFilter === item.key &&
                      styles.statusFilterButtonActive,
                  ]}
                  onPress={() => setCatalogStatusFilter(item.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.statusFilterText,
                      catalogStatusFilter === item.key &&
                        styles.statusFilterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))
            : STATUS_FILTERS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.statusFilterButton,
                    statusFilter === item.key &&
                      styles.statusFilterButtonActive,
                  ]}
                  onPress={() => setStatusFilter(item.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.statusFilterText,
                      statusFilter === item.key &&
                        styles.statusFilterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {filter === 'all'
            ? 'Your Orders'
            : filter === 'catalog'
              ? 'Catalog Orders'
              : 'Custom Requests'}
        </Text>

        <Text style={styles.resultsCount}>
          {visibleOrders.length}{' '}
          {visibleOrders.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {visibleOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {orders.length === 0
              ? 'No orders yet'
              : searchQuery.trim()
                ? 'No matching orders'
                : 'No orders found'}
          </Text>

          <Text style={styles.emptyText}>
            {orders.length === 0
              ? 'Your orders and custom garment requests will appear here.'
              : searchQuery.trim()
                ? 'Try another search term or change your filters.'
                : 'There are no orders matching your selected filters.'}
          </Text>

          {searchQuery.length > 0 ||
          filter !== 'all' ||
          statusFilter !== 'all' ||
          customStatusFilter !== 'all' ||
          catalogStatusFilter !== 'all' ? (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                setSearchQuery('');
                setFilter('all');
                setStatusFilter('all');
                setCustomStatusFilter('all');
                setCatalogStatusFilter('all');
              }}
            >
              <Text style={styles.refreshButtonText}>
                Clear Search and Filters
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <Text style={styles.refreshButtonText}>
                Refresh Orders
              </Text>
            </TouchableOpacity>
          )}
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
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.orderType}>
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
        Pull down to refresh your orders.
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
    paddingTop: 20,
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
  searchContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EED8E1',
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: '#333333',
    fontSize: 13,
    paddingVertical: 12,
  },
  clearSearchButton: {
    paddingVertical: 8,
    paddingLeft: 10,
  },
  clearSearchText: {
    color: DARK_PINK,
    fontSize: 12,
    fontWeight: '700',
  },
  filterHeading: {
    color: '#684754',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 9,
  },
  filterScrollContent: {
    gap: 8,
    paddingBottom: 15,
    paddingRight: 5,
  },
  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#F2E6EB',
    alignItems: 'center',
    justifyContent: 'center',
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
  statusFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EED8E1',
  },
  statusFilterButtonActive: {
    backgroundColor: '#FCE7EF',
    borderColor: PINK,
  },
  statusFilterText: {
    color: '#765D67',
    fontSize: 11,
    fontWeight: '600',
  },
  statusFilterTextActive: {
    color: DARK_PINK,
    fontWeight: '800',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 12,
  },
  resultsTitle: {
    color: DARK_PINK,
    fontSize: 16,
    fontWeight: '800',
  },
  resultsCount: {
    color: '#888888',
    fontSize: 11,
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
  cardHeaderInfo: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
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
    fontSize: 12,
    lineHeight: 19,
    marginTop: 2,
  },
  priceText: {
    color: DARK_PINK,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 7,
  },
  depositText: {
    color: '#237A4B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  pendingPrice: {
    color: '#946200',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 7,
  },
  paymentNotice: {
    color: '#946200',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
    textAlign: 'center',
  },
  productImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF0F5',
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF0F5',
  },
  productImagePlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 7,
  },
  smallPlaceholderText: {
    color: '#94677A',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  completionInline: {
    marginTop: 8,
  },
  completionInlineText: {
    color: '#237A4B',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
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
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '400',
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
  detailsArrow: {
    color: PINK,
    fontSize: 22,
    lineHeight: 22,
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
    textAlign: 'center',
  },
  footer: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
});