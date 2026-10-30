
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'OrderDetails'
>;

type CustomOrder = {
  id: string;
  reference_image_url: string | null;
  garment_description: string;
  special_instructions: string | null;
  preferred_color: string | null;
  fabric_preference: string | null;
  needed_by_date: string | null;
  estimated_completion_date: string | null;
  fitting_date: string | null;
  pickup_date: string | null;
  decline_reason: string | null;
  status: string;
  quoted_price: number | string | null;
  deposit_amount: number | string | null;
  quotation_note: string | null;
  created_at: string;
  signedImageUrl?: string | null;
};

type CatalogItem = {
  id: string;
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
  fitting_date: string | null;
  pickup_date: string | null;
  items: CatalogItem[];
};

type ProductionTracking = {
  id: string;
  status: string;
  tailor_id: string;
  tailorName: string | null;
  updated_at: string;
};

type PaymentRecord = {
  amount: number | string;
  status: string;
  payment_type: string;
  payment_method: string;
  paid_at: string | null;
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
    label: 'Declined',
    color: '#B42335',
    background: '#FCE8EA',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#666666',
    background: '#EEEEEE',
  },
};

const PRODUCTION_STAGES = [
  { status: 'assigned', label: 'Assigned to Tailor' },
  { status: 'cutting', label: 'Cutting' },
  { status: 'sewing', label: 'Sewing' },
  { status: 'fitting', label: 'Fitting' },
  { status: 'finishing', label: 'Finishing' },
  { status: 'ready_for_pickup', label: 'Ready for Pickup' },
  { status: 'completed', label: 'Completed' },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not specified';

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T12:00:00`
      : value,
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
  });
};

const formatPrice = (
  amount: number | string | null | undefined,
) => {
  if (amount === null || amount === undefined || amount === '') {
    return 'Not specified';
  }

  const value = Number(amount);

  if (!Number.isFinite(value)) return 'Not specified';

  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusInfo = (status: string) =>
  STATUS_INFO[status.toLowerCase()] || {
    label: status.replace(/_/g, ' '),
    color: '#555',
    background: '#EEEEEE',
  };

const getUniqueIds = (
  values: (string | null | undefined)[],
) => [
  ...new Set(
    values.filter((value): value is string => Boolean(value)),
  ),
];

export default function OrderDetailsScreen({ route }: Props) {
  const { orderId, orderType } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [customOrder, setCustomOrder] =
    useState<CustomOrder | null>(null);

  const [catalogOrder, setCatalogOrder] =
    useState<CatalogOrder | null>(null);

  const [productionTracking, setProductionTracking] =
    useState<ProductionTracking | null>(null);

  const [paymentRecords, setPaymentRecords] =
    useState<PaymentRecord[] | null>(null);

  const [paymentError, setPaymentError] =
    useState<string | null>(null);

  // Load payment records for either catalog or custom orders.
  const fetchPayments = async (
    currentOrderId: string,
    currentOrderType: 'custom' | 'catalog',
  ) => {
    try {
      let paymentQuery = supabase
        .from('payments')
        .select(
          'amount, status, payment_type, payment_method, paid_at',
        );

      if (currentOrderType === 'custom') {
        paymentQuery = paymentQuery.eq(
          'custom_order_id',
          currentOrderId,
        );
      } else {
        paymentQuery = paymentQuery.eq(
          'order_id',
          currentOrderId,
        );
      }

      const { data, error } = await paymentQuery;

      if (error) throw error;

      setPaymentRecords((data || []) as PaymentRecord[]);
      setPaymentError(null);
    } catch (error: any) {
      console.warn('Unable to load payments:', error.message);

      setPaymentRecords(null);
      setPaymentError(
        error?.message || 'Unable to load payment records.',
      );
    }
  };

  const fetchProductionTracking = async (
    currentOrderId: string,
    currentOrderType: 'custom' | 'catalog',
  ) => {
    try {
      let trackingQuery = supabase
        .from('production_tracking')
        .select('id, status, tailor_id, updated_at');

      if (currentOrderType === 'custom') {
        trackingQuery = trackingQuery.eq(
          'custom_order_id',
          currentOrderId,
        );
      } else {
        trackingQuery = trackingQuery.eq(
          'order_id',
          currentOrderId,
        );
      }

      const { data: trackingData, error: trackingError } =
        await trackingQuery
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

      if (trackingError) {
        console.warn(
          'Unable to load production tracking:',
          trackingError.message,
        );
        setProductionTracking(null);
        return;
      }

      if (!trackingData) {
        setProductionTracking(null);
        return;
      }

      let tailorName: string | null = null;

      const { data: tailorData, error: tailorError } =
        await supabase
          .from('tailors')
          .select('full_name')
          .eq('id', trackingData.tailor_id)
          .maybeSingle();

      if (tailorError) {
        console.warn(
          'Unable to load tailor name:',
          tailorError.message,
        );
      } else {
        tailorName = tailorData?.full_name || null;
      }

      setProductionTracking({
        id: trackingData.id,
        status: trackingData.status,
        tailor_id: trackingData.tailor_id,
        tailorName,
        updated_at: trackingData.updated_at,
      });
    } catch (error) {
      console.warn('Production tracking error:', error);
      setProductionTracking(null);
    }
  };

  const fetchOrder = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error('Please log in to view this order.');
      }

      setCustomOrder(null);
      setCatalogOrder(null);
      setProductionTracking(null);
      setPaymentRecords(null);
      setPaymentError(null);

      if (orderType === 'custom') {
        const { data, error } = await supabase
          .from('custom_orders')
          .select(
            'id, reference_image_url, garment_description, special_instructions, preferred_color, fabric_preference, needed_by_date, estimated_completion_date, fitting_date, pickup_date, decline_reason, status, quoted_price, deposit_amount, quotation_note, created_at',
          )
          .eq('id', orderId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            'This custom order was not found or you do not have permission to view it.',
          );
        }

        await Promise.all([
          fetchProductionTracking(orderId, 'custom'),
          fetchPayments(orderId, 'custom'),
        ]);

        const order = data as CustomOrder;
        let signedImageUrl: string | null = null;
        const storedValue = order.reference_image_url?.trim();

        if (storedValue) {
          try {
            let imagePath = storedValue;

            if (/^https?:\/\//i.test(imagePath)) {
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

                imagePath = storagePath.startsWith(bucketPrefix)
                  ? storagePath.slice(bucketPrefix.length)
                  : storagePath;

                imagePath = decodeURIComponent(imagePath);
              } else {
                signedImageUrl = imagePath;
              }
            }

            if (!signedImageUrl) {
              imagePath = imagePath.replace(
                /^\/?custom-order-images\//,
                '',
              );

              const { data: imageData, error: imageError } =
                await supabase.storage
                  .from('custom-order-images')
                  .createSignedUrl(imagePath, 60 * 60);

              if (imageError) {
                console.warn(
                  'Unable to load reference image:',
                  imageError.message,
                );
              } else {
                signedImageUrl = imageData.signedUrl;
              }
            }
          } catch (imageError) {
            console.warn(
              'Unable to process reference image:',
              imageError,
            );
          }
        }

        setCustomOrder({
          ...order,
          signedImageUrl,
        });

        return;
      }

      const { data: orderData, error: orderError } =
        await supabase
          .from('orders')
          .select(
            'id, status, total_amount, created_at, fitting_date, pickup_date',
          )
          .eq('id', orderId)
          .eq('customer_id', user.id)
          .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData) {
        throw new Error(
          'This catalog order was not found or you do not have permission to view it.',
        );
      }

      await Promise.all([
        fetchProductionTracking(orderId, 'catalog'),
        fetchPayments(orderId, 'catalog'),
      ]);

      const { data: itemData, error: itemError } =
        await supabase
          .from('order_items')
          .select(
            'id, garment_id, garment_part_id, design_id, fabric_id, quantity, unit_price, subtotal',
          )
          .eq('order_id', orderId);

      if (itemError) throw itemError;

      const items = (itemData || []) as CatalogItem[];

      const garmentIds = getUniqueIds(
        items.map((item) => item.garment_id),
      );

      const partIds = getUniqueIds(
        items.map((item) => item.garment_part_id),
      );

      const designIds = getUniqueIds(
        items.map((item) => item.design_id),
      );

      const fabricIds = getUniqueIds(
        items.map((item) => item.fabric_id),
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

      const fetchDesigns = async (): Promise<
        Record<
          string,
          { name: string; image_url: string | null }
        >
      > => {
        if (designIds.length === 0) return {};

        const { data, error } = await supabase
          .from('designs')
          .select('id, name, image_url')
          .in('id', designIds);

        if (error) {
          console.warn(
            'Unable to load design details:',
            error.message,
          );
          return {};
        }

        return Object.fromEntries(
          (data || []).map(
            (design: {
              id: string;
              name: string;
              image_url: string | null;
            }) => [
              design.id,
              {
                name: design.name,
                image_url: design.image_url,
              },
            ],
          ),
        );
      };

      const [
        garmentNames,
        partNames,
        fabricNames,
        designs,
      ] = await Promise.all([
        fetchNames('garments', garmentIds),
        fetchNames('garment_parts', partIds),
        fetchNames('fabrics', fabricIds),
        fetchDesigns(),
      ]);

      const resolvedItems = items.map((item) => {
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
      });

      setCatalogOrder({
        ...orderData,
        items: resolvedItems,
      } as CatalogOrder);
    } catch (error: any) {
      console.error('Order details error:', error);

      Alert.alert(
        'Unable to Load Order',
        error?.message ||
          'Please refresh the screen and try again.',
      );
    }
  }, [orderId, orderType]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);
        await fetchOrder();

        if (active) setLoading(false);
      };

      void load();

      return () => {
        active = false;
      };
    }, [fetchOrder]),
  );

  // Listen for production, schedule, and payment updates.
  useEffect(() => {
    const filterColumn =
      orderType === 'custom'
        ? 'custom_order_id'
        : 'order_id';

    const productionChannel = supabase
      .channel(`production-${orderType}-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_tracking',
          filter: `${filterColumn}=eq.${orderId}`,
        },
        () => {
          void fetchOrder();
        },
      )
      .subscribe();

    const scheduleTable =
      orderType === 'custom' ? 'custom_orders' : 'orders';

    const scheduleChannel = supabase
      .channel(`schedule-${orderType}-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: scheduleTable,
          filter: `id=eq.${orderId}`,
        },
        () => {
          void fetchOrder();
        },
      )
      .subscribe();

    const paymentChannel = supabase
      .channel(`payments-${orderType}-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `${filterColumn}=eq.${orderId}`,
        },
        () => {
          void fetchOrder();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(productionChannel);
      void supabase.removeChannel(scheduleChannel);
      void supabase.removeChannel(paymentChannel);
    };
  }, [orderId, orderType, fetchOrder]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchOrder();
    } finally {
      setRefreshing(false);
    }
  };

  const renderDetail = (
    label: string,
    value: string | null | undefined,
  ) => (
    <View style={styles.detailBox}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>
        {value?.trim() || 'Not specified'}
      </Text>
    </View>
  );

  // Payment summary using actual successful payment records.
  const renderPaymentSummary = (
    totalAmount: number | null,
    depositRequired: number | null,
  ) => {
    const paidPayments = (paymentRecords || []).filter(
      (payment) => payment.status?.toLowerCase() === 'paid',
    );

    const amountPaid = paidPayments.reduce(
      (total, payment) => {
        const amount = Number(payment.amount);
        return total + (Number.isFinite(amount) ? amount : 0);
      },
      0,
    );

    const validTotal =
      totalAmount !== null && Number.isFinite(totalAmount);

    const remainingBalance = validTotal
      ? Math.max(0, totalAmount - amountPaid)
      : null;

    let paymentStatus = 'Awaiting Quotation';
    let paymentColor = '#946200';
    let paymentBackground = '#FFF3CD';

    if (validTotal) {
      if (amountPaid <= 0) {
        paymentStatus = 'Unpaid';
        paymentColor = '#B42335';
        paymentBackground = '#FCE8EA';
      } else if (amountPaid < totalAmount) {
        paymentStatus = 'Partially Paid';
        paymentColor = '#946200';
        paymentBackground = '#FFF3CD';
      } else {
        paymentStatus = 'Fully Paid';
        paymentColor = '#237A4B';
        paymentBackground = '#E1F6E9';
      }
    }

    return (
      <View style={styles.section}>
        <View style={styles.paymentHeading}>
          <View style={styles.paymentHeadingIcon}>
            <Ionicons
              name="wallet-outline"
              size={23}
              color={PINK}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Payment Summary
            </Text>
            <Text style={styles.paymentSubtitle}>
              Your order payment information
            </Text>
          </View>
        </View>

        {paymentError ? (
          <View style={styles.paymentErrorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B42335"
            />

            <Text style={styles.paymentErrorText}>
              Unable to load payment records. Please refresh or contact
              the shop. Your paid amount cannot currently be verified.
            </Text>
          </View>
        ) : paymentRecords === null ? (
          <View style={styles.paymentLoading}>
            <ActivityIndicator size="small" color={PINK} />
            <Text style={styles.helperText}>
              Loading payment information...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Total Order Amount
              </Text>

              <Text style={styles.paymentValue}>
                {validTotal
                  ? formatPrice(totalAmount)
                  : 'Not available yet'}
              </Text>
            </View>

            {depositRequired !== null ? (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  Required Deposit
                </Text>

                <Text style={styles.paymentValue}>
                  {formatPrice(depositRequired)}
                </Text>
              </View>
            ) : null}

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Total Amount Paid
              </Text>

              <Text style={styles.paidValue}>
                {formatPrice(amountPaid)}
              </Text>
            </View>

            <View style={styles.paymentDivider} />

            <View style={styles.remainingBox}>
              <Text style={styles.remainingLabel}>
                Remaining Balance
              </Text>

              <Text style={styles.remainingValue}>
                {remainingBalance !== null
                  ? formatPrice(remainingBalance)
                  : 'Awaiting quotation'}
              </Text>
            </View>

            <View
              style={[
                styles.paymentStatusBadge,
                { backgroundColor: paymentBackground },
              ]}
            >
              <Ionicons
                name={
                  paymentStatus === 'Fully Paid'
                    ? 'checkmark-circle'
                    : paymentStatus === 'Partially Paid'
                      ? 'time'
                      : 'alert-circle'
                }
                size={17}
                color={paymentColor}
              />

              <Text
                style={[
                  styles.paymentStatusText,
                  { color: paymentColor },
                ]}
              >
                {paymentStatus}
              </Text>
            </View>

            {paidPayments.length > 0 ? (
              <View style={styles.paymentHistory}>
                <Text style={styles.paymentHistoryTitle}>
                  Recorded Payments
                </Text>

                {paidPayments.map((payment, index) => (
                  <View
                    key={`${payment.paid_at || index}-${index}`}
                    style={styles.paymentHistoryItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentHistoryType}>
                        {payment.payment_type
                          ? payment.payment_type.replace(/_/g, ' ')
                          : 'Payment'}
                      </Text>

                      <Text style={styles.paymentHistoryDate}>
                        {formatDateTime(payment.paid_at)}
                      </Text>

                      <Text style={styles.paymentHistoryMethod}>
                        {payment.payment_method || 'Not specified'}
                      </Text>
                    </View>

                    <Text style={styles.paymentHistoryAmount}>
                      {formatPrice(payment.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.helperText}>
                No confirmed payments have been recorded for this order.
              </Text>
            )}
          </>
        )}

        <Text style={styles.paymentFootnote}>
          Only payments marked as Paid are included in the amount paid.
        </Text>
      </View>
    );
  };

  // Fitting and pickup schedule display.
  const renderSchedule = (
    fittingDate: string | null,
    pickupDate: string | null,
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Fitting & Pickup Schedule
      </Text>

      <Text style={styles.helperText}>
        Check your scheduled fitting and pickup dates below.
      </Text>

      <View style={styles.scheduleItem}>
        <View style={styles.scheduleIcon}>
          <Ionicons
            name="shirt-outline"
            size={23}
            color={PINK}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.scheduleLabel}>
            Fitting Date
          </Text>

          <Text style={styles.scheduleValue}>
            {fittingDate
              ? formatDate(fittingDate)
              : 'Not scheduled yet'}
          </Text>

          {!fittingDate && (
            <Text style={styles.scheduleHint}>
              Staff will set your fitting date when your garment
              reaches the fitting stage.
            </Text>
          )}
        </View>
      </View>

      <View style={styles.scheduleItem}>
        <View style={styles.scheduleIcon}>
          <Ionicons
            name="calendar-outline"
            size={23}
            color="#237A4B"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.scheduleLabel}>
            Pickup Date
          </Text>

          <Text style={styles.scheduleValue}>
            {pickupDate
              ? formatDate(pickupDate)
              : 'Not scheduled yet'}
          </Text>

          {!pickupDate && (
            <Text style={styles.scheduleHint}>
              Staff will set your pickup date when your garment
              is ready for pickup.
            </Text>
          )}
        </View>
      </View>

      {(fittingDate || pickupDate) && (
        <View style={styles.scheduleNotice}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#946200"
          />
          <Text style={styles.scheduleNoticeText}>
            Please follow the scheduled dates or contact the shop
            if you need to make changes.
          </Text>
        </View>
      )}
    </View>
  );

  const renderProgress = () => {
    if (!productionTracking) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Production Progress
          </Text>

          <View style={styles.noProductionBox}>
            <Ionicons
              name="time-outline"
              size={30}
              color={PINK}
            />

            <Text style={styles.noProductionTitle}>
              Production Not Started Yet
            </Text>

            <Text style={styles.helperText}>
              Your order has not been assigned a production stage yet.
              Once a tailor is assigned and production tracking begins,
              you will see updates here.
            </Text>
          </View>
        </View>
      );
    }

    const currentStatus =
      productionTracking.status.toLowerCase();

    const currentIndex = PRODUCTION_STAGES.findIndex(
      (stage) => stage.status === currentStatus,
    );

    const isCompleted = currentStatus === 'completed';

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Production Progress
        </Text>

        <Text style={styles.helperText}>
          Follow the progress of your garment.
        </Text>

        <View style={styles.tailorBox}>
          <Ionicons
            name="person-circle-outline"
            size={25}
            color={PINK}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.tailorLabel}>
              Assigned Tailor
            </Text>

            <Text style={styles.tailorName}>
              {productionTracking.tailorName ||
                'Assigned tailor'}
            </Text>
          </View>
        </View>

        <View style={styles.updatedBox}>
          <Ionicons
            name="time-outline"
            size={19}
            color={PINK}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.updatedLabel}>
              Last Production Update
            </Text>

            <Text style={styles.updatedValue}>
              {formatDateTime(productionTracking.updated_at)}
            </Text>
          </View>
        </View>

        {currentIndex >= 0 ? (
          PRODUCTION_STAGES.map((stage, index) => {
            const completed = index < currentIndex;
            const current = index === currentIndex;

            return (
              <View key={stage.status} style={styles.progressRow}>
                <View style={styles.timeline}>
                  <View
                    style={[
                      styles.progressDot,
                      (completed || current) &&
                        styles.progressDotActive,
                    ]}
                  >
                    {completed ? (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color="#fff"
                      />
                    ) : current ? (
                      <View style={styles.currentDot} />
                    ) : null}
                  </View>

                  {index < PRODUCTION_STAGES.length - 1 ? (
                    <View
                      style={[
                        styles.progressLine,
                        completed && styles.progressLineActive,
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.progressLabelContainer}>
                  <Text
                    style={[
                      styles.progressLabel,
                      current && styles.progressLabelCurrent,
                      completed && styles.progressLabelComplete,
                    ]}
                  >
                    {stage.label}
                  </Text>

                  {current ? (
                    <Text style={styles.currentStageText}>
                      Current stage
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.helperText}>
            Current production stage: {currentStatus.replace(/_/g, ' ')}
          </Text>
        )}

        {isCompleted && (
          <View style={styles.completedBox}>
            <Ionicons
              name="checkmark-circle"
              size={29}
              color="#237A4B"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.completedTitle}>
                Order Completed!
              </Text>

              <Text style={styles.completedDescription}>
                Your garment has completed its production process.
                Please contact the shop for pickup arrangements.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>
          Loading order details...
        </Text>
      </View>
    );
  }

  if (orderType === 'custom' && customOrder) {
    const status = customOrder.status.toLowerCase();
    const statusInfo = getStatusInfo(status);

    const quotedPrice =
      customOrder.quoted_price === null ||
      customOrder.quoted_price === ''
        ? null
        : Number(customOrder.quoted_price);

    const deposit =
      customOrder.deposit_amount === null ||
      customOrder.deposit_amount === ''
        ? null
        : Number(customOrder.deposit_amount);

    const hasQuote =
      quotedPrice !== null && Number.isFinite(quotedPrice);

    const hasDeposit =
      deposit !== null && Number.isFinite(deposit);

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
        <View style={styles.header}>
          <Text style={styles.heading}>Custom Order Details</Text>

          <Text style={styles.orderNumber}>
            Order #{customOrder.id.slice(0, 8).toUpperCase()}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.background },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: statusInfo.color },
              ]}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Shopee-style order tracking at the top */}
        {renderProgress()}

        {renderSchedule(
          customOrder.fitting_date,
          customOrder.pickup_date,
        )}

        {renderPaymentSummary(
          hasQuote ? quotedPrice : null,
          hasDeposit ? deposit : null,
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference Image</Text>

          {customOrder.signedImageUrl ? (
            <Image
              source={{ uri: customOrder.signedImageUrl }}
              style={styles.referenceImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={38}
                color={PINK}
              />
              <Text style={styles.placeholderText}>
                {customOrder.reference_image_url
                  ? 'Reference image unavailable'
                  : 'No reference image uploaded'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Request Information
          </Text>

          {renderDetail(
            'Garment Description',
            customOrder.garment_description,
          )}

          {renderDetail(
            'Preferred Color',
            customOrder.preferred_color,
          )}

          {renderDetail(
            'Fabric Preference',
            customOrder.fabric_preference,
          )}

          {renderDetail(
            'Needed By',
            formatDate(customOrder.needed_by_date),
          )}

          {renderDetail(
            'Date Submitted',
            formatDate(customOrder.created_at),
          )}

          {renderDetail(
            'Special Instructions',
            customOrder.special_instructions,
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Quotation Details
          </Text>

          {renderDetail(
            'Quoted Price',
            hasQuote ? formatPrice(quotedPrice) : 'Not available yet',
          )}

          {renderDetail(
            'Required Deposit',
            hasDeposit ? formatPrice(deposit) : 'Not specified',
          )}

          {customOrder.quotation_note ? (
            <View style={styles.noteBox}>
              <Text style={styles.detailLabel}>Note from Staff</Text>
              <Text style={styles.detailValue}>
                {customOrder.quotation_note}
              </Text>
            </View>
          ) : null}

          {customOrder.estimated_completion_date &&
          !['declined', 'cancelled'].includes(status) ? (
            <View style={styles.estimatedBox}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color="#237A4B"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.estimatedLabel}>
                  Estimated Completion Date
                </Text>

                <Text style={styles.estimatedValue}>
                  {formatDate(
                    customOrder.estimated_completion_date,
                  )}
                </Text>
              </View>
            </View>
          ) : null}

          {status === 'declined' && customOrder.decline_reason ? (
            <View style={styles.declineBox}>
              <Text style={styles.declineTitle}>
                Reason for Decline
              </Text>

              <Text style={styles.detailValue}>
                {customOrder.decline_reason}
              </Text>
            </View>
          ) : null}

          {status === 'declined' &&
          !customOrder.decline_reason ? (
            <View style={styles.declineBox}>
              <Text style={styles.detailValue}>
                This request or quotation was declined. Please contact
                staff if you need more information.
              </Text>
            </View>
          ) : null}

          {status === 'accepted' ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#237A4B"
              />

              <Text style={styles.successText}>
                Quotation accepted. Follow the next instructions from
                staff for measurements and deposit.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  if (orderType === 'catalog' && catalogOrder) {
    const statusInfo = getStatusInfo(catalogOrder.status);

    const catalogTotal = Number(catalogOrder.total_amount);

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
        <View style={styles.header}>
          <Text style={styles.heading}>Catalog Order Details</Text>

          <Text style={styles.orderNumber}>
            Order #{catalogOrder.id.slice(0, 8).toUpperCase()}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.background },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: statusInfo.color },
              ]}
            >
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Shopee-style order tracking at the top */}
        {renderProgress()}

        {renderSchedule(
          catalogOrder.fitting_date,
          catalogOrder.pickup_date,
        )}

        {renderPaymentSummary(
          Number.isFinite(catalogTotal) ? catalogTotal : null,
          null,
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Order Information
          </Text>

          {renderDetail(
            'Order Date',
            formatDate(catalogOrder.created_at),
          )}

          {renderDetail(
            'Number of Items',
            String(catalogOrder.items.length),
          )}

          {renderDetail(
            'Order Total',
            formatPrice(catalogOrder.total_amount),
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Garment Items</Text>

          {catalogOrder.items.length === 0 ? (
            <Text style={styles.helperText}>
              No item details are available for this order.
            </Text>
          ) : (
            catalogOrder.items.map((item, index) => (
              <View
                key={item.id || `${catalogOrder.id}-${index}`}
                style={styles.itemCard}
              >
                <Text style={styles.itemTitle}>
                  {item.garmentName || 'Garment'}
                </Text>

                {renderDetail('Garment Part', item.partName)}

                <Text style={styles.detailLabel}>
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
                      size={30}
                      color={PINK}
                    />

                    <Text style={styles.placeholderText}>
                      No design image available
                    </Text>
                  </View>
                )}

                {renderDetail('Design Name', item.designName)}
                {renderDetail('Fabric', item.fabricName)}
                {renderDetail('Quantity', String(item.quantity))}

                {renderDetail(
                  'Unit Price',
                  formatPrice(item.unit_price),
                )}

                {renderDetail(
                  'Subtotal',
                  formatPrice(item.subtotal),
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={PINK}
      />

      <Text style={styles.emptyTitle}>Order unavailable</Text>

      <Text style={styles.helperText}>
        We could not load this order. Pull down to refresh or return
        to My Orders and try again.
      </Text>
    </View>
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
  header: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0DFE6',
    padding: 17,
    marginBottom: 15,
  },
  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: DARK_PINK,
  },
  orderNumber: {
    fontSize: 13,
    color: '#777',
    marginTop: 7,
    marginBottom: 13,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0DFE6',
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DARK_PINK,
    marginBottom: 13,
  },
  detailBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
    padding: 11,
    marginBottom: 9,
  },
  detailLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  detailValue: {
    color: '#444',
    fontSize: 13,
    lineHeight: 19,
  },
  referenceImage: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    backgroundColor: '#F5E5EC',
  },
  imagePlaceholder: {
    minHeight: 145,
    borderRadius: 12,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#94677A',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  estimatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EAF7EE',
    borderRadius: 11,
    padding: 12,
    marginTop: 5,
  },
  estimatedLabel: {
    color: '#52715D',
    fontSize: 11,
  },
  estimatedValue: {
    color: '#237A4B',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  noteBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  helperText: {
    color: '#777',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  declineBox: {
    backgroundColor: '#FCE8EA',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  declineTitle: {
    color: '#B42335',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#EAF7EE',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  successText: {
    color: '#237A4B',
    fontSize: 12,
    lineHeight: 19,
    flex: 1,
  },
  noProductionBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  noProductionTitle: {
    color: DARK_PINK,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 9,
  },
  tailorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF0F5',
    borderRadius: 11,
    padding: 12,
    marginBottom: 12,
  },
  tailorLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  tailorName: {
    color: DARK_PINK,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  updatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 17,
  },
  updatedLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  updatedValue: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    minHeight: 38,
  },
  timeline: {
    width: 25,
    alignItems: 'center',
  },
  progressDot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5CDD6',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  progressDotActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },
  currentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  progressLine: {
    position: 'absolute',
    top: 18,
    bottom: -1,
    width: 2,
    backgroundColor: '#E5CDD6',
  },
  progressLineActive: {
    backgroundColor: PINK,
  },
  progressLabelContainer: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 12,
  },
  progressLabel: {
    color: '#999',
    fontSize: 12,
  },
  progressLabelCurrent: {
    color: DARK_PINK,
    fontWeight: '800',
  },
  progressLabelComplete: {
    color: '#555',
  },
  currentStageText: {
    color: PINK,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '700',
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: '#EAF7EE',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  completedTitle: {
    color: '#237A4B',
    fontSize: 14,
    fontWeight: '800',
  },
  completedDescription: {
    color: '#52715D',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  itemCard: {
    backgroundColor: '#FFFAFC',
    borderWidth: 1,
    borderColor: '#F4E3EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 13,
  },
  itemTitle: {
    color: DARK_PINK,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  designImage: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    backgroundColor: '#F5E5EC',
    marginBottom: 10,
  },
  designPlaceholder: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#FCE7EF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF8FA',
    borderRadius: 11,
    padding: 13,
    marginBottom: 10,
  },
  scheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCE7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleLabel: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
  },
  scheduleValue: {
    color: DARK_PINK,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 5,
  },
  scheduleHint: {
    color: '#999',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  scheduleNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#FFF3CD',
    borderRadius: 9,
    padding: 11,
    marginTop: 3,
  },
  scheduleNoticeText: {
    flex: 1,
    color: '#946200',
    fontSize: 11,
    lineHeight: 17,
  },

  // Payment summary styles
  paymentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    gap: 10,
  },
  paymentHeadingIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#FCE7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSubtitle: {
    color: '#999',
    fontSize: 11,
    marginTop: -8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  paymentLabel: {
    color: '#777',
    fontSize: 12,
    flex: 1,
  },
  paymentValue: {
    color: '#444',
    fontSize: 13,
    fontWeight: '700',
  },
  paidValue: {
    color: '#237A4B',
    fontSize: 13,
    fontWeight: '800',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#F0DFE6',
    marginVertical: 7,
  },
  remainingBox: {
    backgroundColor: '#FCE7EF',
    borderRadius: 11,
    padding: 14,
    marginTop: 7,
  },
  remainingLabel: {
    color: '#684754',
    fontSize: 12,
    fontWeight: '700',
  },
  remainingValue: {
    color: DARK_PINK,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },
  paymentStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paymentHistory: {
    borderTopWidth: 1,
    borderTopColor: '#F0DFE6',
    marginTop: 12,
    paddingTop: 12,
  },
  paymentHistoryTitle: {
    color: DARK_PINK,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  paymentHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F6EAF0',
    gap: 10,
  },
  paymentHistoryType: {
    color: '#444',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  paymentHistoryDate: {
    color: '#888',
    fontSize: 10,
    marginTop: 3,
  },
  paymentHistoryMethod: {
    color: '#888',
    fontSize: 10,
    marginTop: 3,
  },
  paymentHistoryAmount: {
    color: '#237A4B',
    fontSize: 13,
    fontWeight: '800',
  },
  paymentFootnote: {
    color: '#999',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },
  paymentErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FCE8EA',
    borderRadius: 10,
    padding: 12,
  },
  paymentErrorText: {
    flex: 1,
    color: '#B42335',
    fontSize: 11,
    lineHeight: 17,
  },
  paymentLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  emptyTitle: {
    color: DARK_PINK,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
});
