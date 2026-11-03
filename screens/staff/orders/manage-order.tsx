import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

type OrderType = 'catalog' | 'custom';

type Tailor = {
  id: string;
  full_name: string;
  contact_number: string | null;
  is_available: boolean;
};

type Assignment = {
  id: string;
  tailor_id: string;
  assigned_at: string;
};

type ProductionRecord = {
  id: string;
  tailor_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};

type Stage = {
  value: string;
  label: string;
};

type CatalogItem = {
  id: string;
  garmentName: string;
  garmentImage: string | null;
  designName: string;
  designImage: string | null;
  partName: string;
  fabricName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type Customer = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  contact_number: string | null;
};

type Measurement = {
  shoulder: number | null;
  chest: number | null;
  waist: number | null;
  sleeve_length: number | null;
  top_length: number | null;
  hips: number | null;
  inseam: number | null;
  bottom_length: number | null;
};

type DepositPaymentStatus = {
  requiredAmount: number;
  paidAmount: number;
  isPaid: boolean;
};

type CashBalanceStatus = {
  paidAmount: number;
  remainingAmount: number;
  isPaid: boolean;
};

const PINK = '#D96B8A';
const STORAGE_BUCKET = 'custom-order-images';

const STAGES: Stage[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'completed', label: 'Completed' },
];

async function checkDepositPayment(
  orderId: string,
  orderType: OrderType,
  orderData: any
): Promise<DepositPaymentStatus> {
  const requiredAmount =
    orderType === 'custom'
      ? Number(orderData.deposit_amount ?? 0)
      : Number(orderData.total_amount ?? 0) * 0.5;

  if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
    throw new Error('The required deposit amount is invalid.');
  }

  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_type, status')
    .eq(
      orderType === 'catalog' ? 'order_id' : 'custom_order_id',
      orderId
    );

  if (error) throw error;

  const paidAmount = (data ?? [])
    .filter(
      (payment: any) =>
        String(payment.payment_type).toLowerCase() === 'deposit' &&
        String(payment.status).toLowerCase() === 'paid'
    )
    .reduce(
      (total: number, payment: any) =>
        total + Number(payment.amount || 0),
      0
    );

  return {
    requiredAmount,
    paidAmount,
    isPaid: paidAmount >= requiredAmount,
  };
}

async function checkCashBalance(
  orderId: string,
  orderType: OrderType,
  orderData: any,
  depositPaidAmount: number
): Promise<CashBalanceStatus> {
  const totalAmount =
    orderType === 'catalog'
      ? Number(orderData.total_amount ?? 0)
      : Number(orderData.quoted_price ?? 0);

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    throw new Error('The order total is invalid.');
  }

  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_type, payment_method, status')
    .eq(
      orderType === 'catalog' ? 'order_id' : 'custom_order_id',
      orderId
    );

  if (error) throw error;

  const paidAmount = (data ?? [])
    .filter(
      (payment: any) =>
        payment.payment_type === 'balance' &&
        payment.payment_method === 'cash' &&
        payment.status === 'paid'
    )
    .reduce(
      (total: number, payment: any) =>
        total + Number(payment.amount || 0),
      0
    );

  const remainingAmount = Math.max(
    0,
    Number(
      (totalAmount - depositPaidAmount - paidAmount).toFixed(2)
    )
  );

  return {
    paidAmount,
    remainingAmount,
    isPaid: remainingAmount <= 0,
  };
}

function Dropdown({
  label,
  value,
  placeholder,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: { label: string; value: string; description?: string }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.disabled]}
        onPress={() => setOpen(!open)}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={
              selected
                ? styles.dropdownValue
                : styles.dropdownPlaceholder
            }
          >
            {selected?.label || placeholder}
          </Text>

          {!!selected?.description && (
            <Text style={styles.dropdownDescription}>
              {selected.description}
            </Text>
          )}
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={PINK}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownOptions}>
          {options.length === 0 ? (
            <Text style={styles.emptyDropdown}>
              No options available.
            </Text>
          ) : (
            options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  value === option.value &&
                    styles.dropdownOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      value === option.value &&
                        styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>

                  {!!option.description && (
                    <Text style={styles.dropdownDescription}>
                      {option.description}
                    </Text>
                  )}
                </View>

                {value === option.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={PINK}
                  />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const getField = (
  record: any,
  keys: string[],
  fallback: any = null
) => {
  for (const key of keys) {
    if (
      record?.[key] !== undefined &&
      record?.[key] !== null
    ) {
      return record[key];
    }
  }

  return fallback;
};

const getId = (record: any, keys: string[]) => {
  const value = getField(record, keys);
  return value ? String(value) : null;
};

export default function ManageOrderScreen() {
  const route = useRoute<any>();

  const { orderId, orderType } = route.params as {
    orderId: string;
    orderType: OrderType;
  };

  const [order, setOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [measurements, setMeasurements] =
    useState<Measurement | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [production, setProduction] =
    useState<ProductionRecord | null>(null);

  const [selectedTailorId, setSelectedTailorId] = useState('');
  const [selectedStage, setSelectedStage] = useState('assigned');

  const [depositPayment, setDepositPayment] =
    useState<DepositPaymentStatus | null>(null);

  const [cashBalance, setCashBalance] =
    useState<CashBalanceStatus | null>(null);

  const [savingCashPayment, setSavingCashPayment] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const [fittingDate, setFittingDate] = useState<Date | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);

  const [showFittingPicker, setShowFittingPicker] = useState(false);
  const [showPickupPicker, setShowPickupPicker] = useState(false);

  const [showFittingTimePicker, setShowFittingTimePicker] =
    useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] =
    useState(false);

  const [savingSchedule, setSavingSchedule] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingStage, setSavingStage] = useState(false);

  const currentOrderStatus = String(
    order?.status ?? ''
  ).toLowerCase();

  const isEligible = currentOrderStatus === 'accepted';

  const productionStatus = String(
    production?.status ?? ''
  ).toLowerCase();

  const canManageAssignment =
    (isEligible || !!assignment) &&
    productionStatus !== 'ready_for_pickup' &&
    productionStatus !== 'completed';

  const showAssignmentSection = isEligible || !!assignment;
  const showProductionSection = !!assignment;

  const formatMoney = (
    amount: number | string | null | undefined
  ) => {
    if (amount == null || amount === '') return 'Not available';

    const value = Number(amount);
    if (!Number.isFinite(value)) return 'Not available';

    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateOnly = (
    value: string | Date | null | undefined
  ) => {
    if (!value) return 'Not specified';

    const parsed = value instanceof Date ? value : new Date(value);

    return Number.isNaN(parsed.getTime())
      ? 'Not specified'
      : parsed.toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
  };

  const formatDateTime = (
    value: string | Date | null | undefined
  ) => {
    if (!value) return 'Not specified';

    const parsed = value instanceof Date ? value : new Date(value);

    return Number.isNaN(parsed.getTime())
      ? 'Not specified'
      : parsed.toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  };

  const formatSelectedDate = (date: Date | null) => {
    if (!date) return 'Not scheduled';

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatSelectedTime = (date: Date | null) => {
    if (!date) return 'Select time';

    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatSelectedDateTime = (date: Date | null) => {
    if (!date) return 'Not scheduled';

    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getDateOnly = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getMinimumPickupDate = () => {
    const today = getToday();

    if (!fittingDate) return today;

    const fitting = getDateOnly(fittingDate);

    return fitting > today ? fitting : today;
  };

  const getStageLabel = (value: string) =>
    STAGES.find((stage) => stage.value === value)?.label ?? value;

  const getReferenceImageUrl = async (
    imageValue: string | null | undefined
  ): Promise<string | null> => {
    if (!imageValue) return null;

    if (
      imageValue.startsWith('http://') ||
      imageValue.startsWith('https://')
    ) {
      if (!imageValue.includes('/storage/v1/')) {
        return imageValue;
      }
    }

    let path = imageValue;
    const marker = `${STORAGE_BUCKET}/`;
    const markerIndex = path.indexOf(marker);

    if (markerIndex !== -1) {
      path = path.substring(markerIndex + marker.length);
    }

    path = path.split('?')[0];

    try {
      path = decodeURIComponent(path);
    } catch {
      // Keep original path.
    }

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(path, 60 * 60);

      if (error) {
        console.log('Reference image error:', error.message);
        return null;
      }

      return data?.signedUrl ?? null;
    } catch {
      return null;
    }
  };

  const loadCatalogItems = async (): Promise<CatalogItem[]> => {
    const { data: itemRows, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemError) throw itemError;

    const rows = itemRows ?? [];
    if (rows.length === 0) return [];

    const garmentIds = [
      ...new Set(
        rows
          .map((item: any) => getId(item, ['garment_id']))
          .filter(Boolean)
      ),
    ] as string[];

    const designIds = [
      ...new Set(
        rows
          .map((item: any) =>
            getId(item, ['design_id', 'selected_design_id'])
          )
          .filter(Boolean)
      ),
    ] as string[];

    const fabricIds = [
      ...new Set(
        rows
          .map((item: any) => getId(item, ['fabric_id']))
          .filter(Boolean)
      ),
    ] as string[];

    const partIds = [
      ...new Set(
        rows
          .map((item: any) =>
            getId(item, ['garment_part_id', 'part_id'])
          )
          .filter(Boolean)
      ),
    ] as string[];

    const [
      garmentResult,
      designResult,
      fabricResult,
      partResult,
    ] = await Promise.all([
      garmentIds.length
        ? supabase.from('garments').select('*').in('id', garmentIds)
        : Promise.resolve({ data: [], error: null }),

      designIds.length
        ? supabase.from('designs').select('*').in('id', designIds)
        : Promise.resolve({ data: [], error: null }),

      fabricIds.length
        ? supabase.from('fabrics').select('*').in('id', fabricIds)
        : Promise.resolve({ data: [], error: null }),

      partIds.length
        ? supabase.from('garment_parts').select('*').in('id', partIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (garmentResult.error) throw garmentResult.error;

    if (designResult.error) {
      console.log('Design details:', designResult.error.message);
    }

    if (fabricResult.error) {
      console.log('Fabric details:', fabricResult.error.message);
    }

    if (partResult.error) {
      console.log('Garment part details:', partResult.error.message);
    }

    const garments = garmentResult.data ?? [];
    const designs = designResult.data ?? [];
    const fabrics = fabricResult.data ?? [];
    const parts = partResult.data ?? [];

    return rows.map((item: any) => {
      const garment = garments.find(
        (record: any) => record.id === item.garment_id
      );

      const designId = getId(item, [
        'design_id',
        'selected_design_id',
      ]);
      const fabricId = getId(item, ['fabric_id']);
      const partId = getId(item, [
        'garment_part_id',
        'part_id',
      ]);

      const design = designs.find(
        (record: any) => record.id === designId
      );

      const fabric = fabrics.find(
        (record: any) => record.id === fabricId
      );

      const part = parts.find(
        (record: any) => record.id === partId
      );

      const quantity = Number(item.quantity ?? 1);

      const unitPrice = Number(
        getField(item, ['unit_price', 'price'], garment?.price ?? 0)
      );

      const subtotal = Number(
        getField(
          item,
          ['subtotal', 'total_price'],
          quantity * unitPrice
        )
      );

      return {
        id: String(item.id),
        garmentName:
          getField(item, ['garment_name', 'name'], garment?.name) ??
          'Garment',
        garmentImage:
          getField(
            item,
            ['garment_image_url', 'image_url'],
            garment?.image_url
          ) ??
          garment?.image ??
          null,
        designName:
          getField(item, ['design_name'], design?.name) ??
          'No design specified',
        designImage:
          getField(item, ['design_image_url'], design?.image_url) ??
          null,
        partName:
          getField(item, ['part_name'], part?.name) ??
          'Not specified',
        fabricName:
          getField(item, ['fabric_name'], fabric?.name) ??
          'Not specified',
        quantity,
        unitPrice,
        subtotal,
      };
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const orderQuery =
        orderType === 'catalog'
          ? supabase
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .maybeSingle()
          : supabase
              .from('custom_orders')
              .select('*')
              .eq('id', orderId)
              .maybeSingle();

      const [
        orderResult,
        tailorResult,
        assignmentResult,
        productionResult,
      ] = await Promise.all([
        orderQuery,

        supabase
          .from('tailors')
          .select('id, full_name, contact_number, is_available')
          .order('full_name'),

        supabase
          .from('tailor_assignments')
          .select('id, tailor_id, assigned_at')
          .eq(
            orderType === 'catalog' ? 'order_id' : 'custom_order_id',
            orderId
          )
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('production_tracking')
          .select('id, tailor_id, status, started_at, completed_at')
          .eq(
            orderType === 'catalog' ? 'order_id' : 'custom_order_id',
            orderId
          )
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (orderResult.error) throw orderResult.error;
      if (tailorResult.error) throw tailorResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      if (productionResult.error) throw productionResult.error;

      if (!orderResult.data) {
        throw new Error('This order could not be found.');
      }

      const orderData = orderResult.data;
      const assigned = assignmentResult.data as Assignment | null;
      const productionData =
        productionResult.data as ProductionRecord | null;

      const paymentStatus = await checkDepositPayment(
        orderId,
        orderType,
        orderData
      );

      const cashStatus = await checkCashBalance(
        orderId,
        orderType,
        orderData,
        paymentStatus.paidAmount
      );

      setDepositPayment(paymentStatus);
      setCashBalance(cashStatus);

      setOrder(orderData);
      setTailors((tailorResult.data ?? []) as Tailor[]);
      setAssignment(assigned);
      setProduction(productionData);

      setSelectedTailorId(assigned?.tailor_id ?? '');
      setSelectedStage(productionData?.status ?? 'assigned');

      setFittingDate(
        orderData.fitting_date
          ? new Date(orderData.fitting_date)
          : null
      );

      setPickupDate(
        orderData.pickup_date
          ? new Date(orderData.pickup_date)
          : null
      );

      const customerId =
        orderType === 'catalog'
          ? orderData.customer_id
          : orderData.user_id;

      if (customerId) {
        const { data: customerData, error: customerError } =
          await supabase
            .from('profiles')
            .select('full_name, username, email, contact_number')
            .eq('id', customerId)
            .maybeSingle();

        if (customerError) {
          console.log('Customer details:', customerError.message);
        }

        setCustomer(customerData ?? null);
      } else {
        setCustomer(null);
      }

      const savedSnapshot = orderData.measurement_snapshot as
        | Measurement
        | null;

      setMeasurements(savedSnapshot ?? null);

      if (orderType === 'catalog') {
        const items = await loadCatalogItems();
        setCatalogItems(items);
        setReferenceImage(null);
      } else {
        setCatalogItems([]);

        const imageUrl = await getReferenceImageUrl(
          orderData.reference_image_url
        );

        setReferenceImage(imageUrl);
      }
    } catch (error: any) {
      Alert.alert(
        'Unable to Load Order',
        error?.message ?? 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, orderType]);

  // Accept a pending catalog order.
  const acceptCatalogOrder = () => {
    if (orderType !== 'catalog') return;

    if (currentOrderStatus !== 'pending') {
      Alert.alert(
        'Unable to Accept Order',
        'This order is no longer pending. Please refresh the order details.'
      );
      void loadData();
      return;
    }

    Alert.alert(
      'Accept Order',
      'Are you sure you want to accept this catalog order? The customer can already pay the deposit while the order is pending.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept Order',
          onPress: async () => {
            setAcceptingOrder(true);

            try {
              const { data: latestOrder, error: fetchError } =
                await supabase
                  .from('orders')
                  .select('id, status')
                  .eq('id', orderId)
                  .maybeSingle();

              if (fetchError) throw fetchError;

              if (!latestOrder) {
                throw new Error('This order could not be found.');
              }

              if (
                String(latestOrder.status ?? '').toLowerCase() !==
                'pending'
              ) {
                Alert.alert(
                  'Order Already Updated',
                  'This order is no longer pending. Please refresh the order details.'
                );
                await loadData();
                return;
              }

              const { data: updatedOrder, error: updateError } =
                await supabase
                  .from('orders')
                  .update({ status: 'accepted' })
                  .eq('id', orderId)
                  .eq('status', 'pending')
                  .select('id, status')
                  .maybeSingle();

              if (updateError) throw updateError;

              if (!updatedOrder) {
                throw new Error(
                  'The order could not be accepted because its status has changed. Please refresh.'
                );
              }

              Alert.alert(
                'Order Accepted',
                'The catalog order has been accepted. You can assign a tailor once the required deposit is fully paid.'
              );

              await loadData();
            } catch (error: any) {
              Alert.alert(
                'Accept Failed',
                error?.message ?? 'Unable to accept this order.'
              );
            } finally {
              setAcceptingOrder(false);
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const availableTailors = tailors.filter(
    (tailor) => tailor.is_available
  );

  const tailorOptions = [
    ...availableTailors,
    ...tailors.filter(
      (tailor) =>
        !tailor.is_available &&
        tailor.id === assignment?.tailor_id
    ),
  ];

  const selectedTailor = tailors.find(
    (tailor) => tailor.id === selectedTailorId
  );

  const recordCashBalancePayment = async () => {
    if (production?.status !== 'ready_for_pickup') {
      Alert.alert(
        'Not Ready for Pickup',
        'Cash balance can only be collected when the order is ready for pickup.'
      );
      return;
    }

    if (!depositPayment?.isPaid) {
      Alert.alert(
        'Deposit Not Paid',
        'The required online deposit must be fully paid first.'
      );
      return;
    }

    if (cashBalance?.isPaid || !cashBalance?.remainingAmount) {
      Alert.alert(
        'Already Paid',
        'The remaining balance has already been paid.'
      );
      return;
    }

    Alert.alert(
      'Confirm Cash Payment',
      `Confirm that the customer has paid ${formatMoney(
        cashBalance.remainingAmount
      )} in cash? This will record the payment as paid.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm Payment',
          onPress: async () => {
            setSavingCashPayment(true);

            try {
              const latestDeposit = await checkDepositPayment(
                orderId,
                orderType,
                order
              );

              if (!latestDeposit.isPaid) {
                throw new Error(
                  'The required online deposit is not fully paid.'
                );
              }

              const latestCash = await checkCashBalance(
                orderId,
                orderType,
                order,
                latestDeposit.paidAmount
              );

              if (
                latestCash.isPaid ||
                latestCash.remainingAmount <= 0
              ) {
                throw new Error(
                  'The remaining balance has already been recorded as paid.'
                );
              }

              const amount = Number(
                latestCash.remainingAmount.toFixed(2)
              );

              const paymentRecord = {
                order_id: orderType === 'catalog' ? orderId : null,
                custom_order_id:
                  orderType === 'custom' ? orderId : null,
                payment_type: 'balance',
                payment_method: 'cash',
                amount,
                status: 'paid',
                transaction_id: null,
                paid_at: new Date().toISOString(),
              };

              const { error } = await supabase
                .from('payments')
                .insert(paymentRecord);

              if (error) throw error;

              Alert.alert(
                'Payment Recorded',
                `${formatMoney(amount)} cash balance payment has been successfully recorded.`
              );

              await loadData();
            } catch (error: any) {
              Alert.alert(
                'Payment Failed',
                error?.message ?? 'Unable to record the cash payment.'
              );
            } finally {
              setSavingCashPayment(false);
            }
          },
        },
      ]
    );
  };

  const saveSchedule = async () => {
    let fieldToUpdate: 'fitting_date' | 'pickup_date';
    let selectedDate: Date | null;

    if (selectedStage === 'fitting') {
      fieldToUpdate = 'fitting_date';
      selectedDate = fittingDate;

      if (!selectedDate) {
        Alert.alert(
          'Select Fitting Date',
          'Please select a fitting appointment date and time.'
        );
        return;
      }

      if (selectedDate.getTime() < Date.now()) {
        Alert.alert(
          'Invalid Date',
          'Fitting date and time cannot be in the past.'
        );
        return;
      }

      if (
        pickupDate &&
        selectedDate.getTime() > pickupDate.getTime()
      ) {
        Alert.alert(
          'Invalid Schedule',
          'Fitting date and time cannot be later than the already scheduled pickup.'
        );
        return;
      }
    } else if (selectedStage === 'ready_for_pickup') {
      fieldToUpdate = 'pickup_date';
      selectedDate = pickupDate;

      if (!selectedDate) {
        Alert.alert(
          'Select Pickup Date',
          'Please select a pickup appointment date and time.'
        );
        return;
      }

      if (selectedDate.getTime() < Date.now()) {
        Alert.alert(
          'Invalid Schedule',
          'Pickup date and time cannot be in the past.'
        );
        return;
      }

      if (
        fittingDate &&
        selectedDate.getTime() < fittingDate.getTime()
      ) {
        Alert.alert(
          'Invalid Schedule',
          'Pickup date and time cannot be earlier than the fitting appointment.'
        );
        return;
      }
    } else {
      return;
    }

    setSavingSchedule(true);

    try {
      const values = {
        [fieldToUpdate]: selectedDate.toISOString(),
      };

      const result =
        orderType === 'catalog'
          ? await supabase
              .from('orders')
              .update(values)
              .eq('id', orderId)
          : await supabase
              .from('custom_orders')
              .update(values)
              .eq('id', orderId);

      if (result.error) throw result.error;

      Alert.alert(
        'Schedule Saved',
        selectedStage === 'fitting'
          ? 'The fitting appointment has been saved successfully.'
          : 'The pickup appointment has been saved successfully.'
      );

      await loadData();
    } catch (error: any) {
      Alert.alert(
        'Save Failed',
        error?.message ?? 'Unable to save the schedule.'
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const saveAssignment = async () => {
    if (!canManageAssignment) {
      Alert.alert(
        'Assignment Not Allowed',
        productionStatus === 'ready_for_pickup' ||
          productionStatus === 'completed'
          ? 'The tailor assignment is locked because this order is ready for pickup or completed.'
          : orderType === 'catalog'
            ? 'Only Accepted catalog orders can receive an initial tailor assignment.'
            : 'Only Accepted custom orders can receive an initial tailor assignment.'
      );
      return;
    }

    if (!selectedTailorId) {
      Alert.alert('Select a Tailor', 'Please select a tailor first.');
      return;
    }

    if (!selectedTailor?.is_available) {
      Alert.alert(
        'Tailor Unavailable',
        'Please select an available tailor.'
      );
      return;
    }

    setSavingAssignment(true);

    try {
      // Verify acceptance before creating an initial assignment.
      if (!assignment) {
        const statusTable =
          orderType === 'catalog' ? 'orders' : 'custom_orders';

        const { data: latestOrder, error: statusError } =
          await supabase
            .from(statusTable)
            .select('status')
            .eq('id', orderId)
            .maybeSingle();

        if (statusError) throw statusError;

        if (
          !latestOrder ||
          String(latestOrder.status ?? '').toLowerCase() !==
            'accepted'
        ) {
          throw new Error(
            orderType === 'catalog'
              ? 'Accept this catalog order before assigning a tailor.'
              : 'This custom order must be accepted before assigning a tailor.'
          );
        }
      }

      const paymentStatus = await checkDepositPayment(
        orderId,
        orderType,
        order
      );

      setDepositPayment(paymentStatus);

      if (!paymentStatus.isPaid) {
        Alert.alert(
          'Deposit Not Yet Paid',
          `The required deposit is ${formatMoney(
            paymentStatus.requiredAmount
          )}, but only ${formatMoney(
            paymentStatus.paidAmount
          )} has been confirmed as paid. Please wait for the customer's deposit payment before assigning a tailor.`
        );
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please log in again.');
      }

      const now = new Date().toISOString();

      const values = {
        tailor_id: selectedTailorId,
        order_id: orderType === 'catalog' ? orderId : null,
        custom_order_id:
          orderType === 'custom' ? orderId : null,
        assigned_by: user.id,
        assigned_at: now,
      };

      const result = assignment
        ? await supabase
            .from('tailor_assignments')
            .update(values)
            .eq('id', assignment.id)
        : await supabase
            .from('tailor_assignments')
            .insert(values);

      if (result.error) throw result.error;

      if (production) {
        const { error } = await supabase
          .from('production_tracking')
          .update({
            tailor_id: selectedTailorId,
            updated_at: now,
          })
          .eq('id', production.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('production_tracking')
          .insert({
            tailor_id: selectedTailorId,
            order_id: orderType === 'catalog' ? orderId : null,
            custom_order_id:
              orderType === 'custom' ? orderId : null,
            status: 'assigned',
            started_at: null,
            completed_at: null,
            updated_at: now,
          });

        if (error) throw error;
      }

      Alert.alert(
        'Success',
        `${selectedTailor.full_name} has been assigned to this order.`
      );

      await loadData();
    } catch (error: any) {
      Alert.alert(
        'Assignment Failed',
        error?.message ?? 'Unable to save the assignment.'
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  
    const updateStage = async () => {
        if (!assignment) {
            Alert.alert(
                'No Tailor Assigned',
                'Please assign a tailor before updating production.'
            );
            return;
        }

        if (!selectedStage) {
            Alert.alert(
                'Select a Stage',
                'Please select a production stage.'
            );
            return;
        }

        if (productionStatus === 'completed') {
            Alert.alert(
                'Production Completed',
                'This order has already been completed. Its production stage cannot be changed.'
            );
            return;
        }

        setSavingStage(true);

        try {
            const paymentStatus = await checkDepositPayment(
                orderId,
                orderType,
                order
            );

            setDepositPayment(paymentStatus);

            if (!paymentStatus.isPaid) {
            Alert.alert(
                'Deposit Not Yet Paid',
                'Production cannot proceed until the required deposit is confirmed as paid.'
            );
            return;
            }

            if (selectedStage === 'completed') {
                const latestCash = await checkCashBalance(
                    orderId,
                    orderType,
                    order,
                    paymentStatus.paidAmount
            );

            setCashBalance(latestCash);

            if (!latestCash.isPaid) {
                Alert.alert(
                    'Balance Not Yet Paid',
                    `The remaining balance of ${formatMoney(
                        latestCash.remainingAmount
                    )} must be collected in cash before marking this order as completed.`
                );
                return;
            }
            }

            const now = new Date().toISOString();

            const values: any = {
                tailor_id: assignment.tailor_id,
                order_id: orderType === 'catalog' ? orderId : null,
                custom_order_id:
                orderType === 'custom' ? orderId : null,
                status: selectedStage,
                updated_at: now,
            };

            if (selectedStage !== 'assigned' && !production?.started_at) {
                values.started_at = now;
            }

            if (selectedStage === 'completed') {
                values.completed_at = now;
            } else {
                values.completed_at = null;
            }

            const result = production
                ? await supabase
                    .from('production_tracking')
                    .update(values)
                    .eq('id', production.id)
                : await supabase
                    .from('production_tracking')
                    .insert(values);

            if (result.error) throw result.error;

            // Synchronize the main order status with production status.
            let mainOrderStatus = 'in_production';

            if (selectedStage === 'fitting') {
                mainOrderStatus =
                    orderType === 'custom'
                    ? 'ready_for_fitting'
                    : 'in_production';
            } else if (selectedStage === 'ready_for_pickup') {
                mainOrderStatus = 'ready_for_release';
            } else if (selectedStage === 'completed') {
                mainOrderStatus = 'completed';
            }

            const statusTable =
                orderType === 'catalog' ? 'orders' : 'custom_orders';

            const { error: statusError } = await supabase
                .from(statusTable)
                .update({
                    status: mainOrderStatus,
            })
            .eq('id', orderId);

            if (statusError) throw statusError;

            Alert.alert(
                'Success',
                `Production stage updated to ${getStageLabel(selectedStage)} and order status synchronized.`
            );

            await loadData();
        } catch (error: any) {
            Alert.alert(
                'Update Failed',
                error?.message ?? 'Unable to update production stage.'
            );
        } finally {
            setSavingStage(false);
        }
    };


  const orderTitle =
    orderType === 'catalog'
      ? `Catalog Order #${orderId.slice(0, 8).toUpperCase()}`
      : order?.garment_description || 'Custom Order';

  const orderAmount =
    orderType === 'catalog'
      ? order?.total_amount
      : order?.quoted_price;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.muted}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Order not found</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadData}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>Manage Order</Text>

        <Text style={styles.subtitle}>
          View order details, assign a tailor, update production progress,
          and schedule fitting and pickup.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Customer Information
          </Text>
          <Ionicons
            name="person-circle-outline"
            size={23}
            color={PINK}
          />
        </View>

        <InfoRow
          label="Customer Name"
          value={
            customer?.full_name ||
            customer?.username ||
            'Not available'
          }
        />

        <InfoRow
          label="Email"
          value={customer?.email || 'Not available'}
        />

        <InfoRow
          label="Contact Number"
          value={customer?.contact_number || 'Not available'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Information</Text>

        <Text style={styles.orderTitle}>{orderTitle}</Text>
        <Text style={styles.orderId}>Order ID: {orderId}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {String(order.status).replace(/_/g, ' ')}
          </Text>
        </View>

        <InfoRow
          label="Order Type"
          value={
            orderType === 'catalog'
              ? 'Catalog Order'
              : 'Custom Order'
          }
        />

        <InfoRow
          label={orderType === 'catalog' ? 'Order Total' : 'Quoted Price'}
          value={formatMoney(orderAmount)}
        />

        <InfoRow
          label="Required Deposit"
          value={formatMoney(depositPayment?.requiredAmount)}
        />

        <InfoRow
          label="Confirmed Deposit Paid"
          value={formatMoney(depositPayment?.paidAmount)}
        />

        <InfoRow
          label="Deposit Payment Status"
          value={
            depositPayment?.isPaid
              ? 'Paid'
              : 'Waiting for Payment'
          }
        />

        <InfoRow
          label="Date Submitted"
          value={formatDateTime(order.created_at)}
        />

        {orderType === 'custom' && (
          <>
            <InfoRow
              label="Needed By"
              value={formatDateOnly(order.needed_by_date)}
            />

            <InfoRow
              label="Estimated Completion"
              value={formatDateOnly(order.estimated_completion_date)}
            />
          </>
        )}
      </View>

      {/* CATALOG ORDER APPROVAL */}
      {orderType === 'catalog' &&
        currentOrderStatus === 'pending' && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order Approval</Text>
              <Ionicons
                name="clipboard-outline"
                size={22}
                color={PINK}
              />
            </View>

            <Text style={styles.measurementDescription}>
              Review the customer's order details before accepting.
              The customer can already pay the 50% deposit while the
              order is pending. Tailor assignment will only be allowed
              after acceptance and full deposit payment.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                acceptingOrder && styles.disabled,
              ]}
              onPress={acceptCatalogOrder}
              disabled={acceptingOrder}
            >
              {acceptingOrder ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color="#FFFFFF"
                  />{' '}
                  Accept Order
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      {production?.status === 'ready_for_pickup' && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Cash Balance Payment
            </Text>

            <Ionicons
              name="cash-outline"
              size={23}
              color={PINK}
            />
          </View>

          <Text style={styles.measurementDescription}>
            The customer must pay the remaining balance in cash when
            collecting the finished garment.
          </Text>

          <InfoRow
            label="Order Total"
            value={formatMoney(orderAmount)}
          />

          <InfoRow
            label="Online Deposit Paid"
            value={formatMoney(depositPayment?.paidAmount)}
          />

          <InfoRow
            label="Cash Balance Already Paid"
            value={formatMoney(cashBalance?.paidAmount ?? 0)}
          />

          <InfoRow
            label="Remaining Balance"
            value={formatMoney(cashBalance?.remainingAmount)}
          />

          {cashBalance?.isPaid ? (
            <View style={styles.cashPaidBox}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#23844D"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.cashPaidTitle}>Fully Paid</Text>

                <Text style={styles.cashPaidDescription}>
                  The customer's cash balance has been recorded.
                  You can now mark the order as Completed.
                </Text>
              </View>
            </View>
          ) : !depositPayment?.isPaid ? (
            <Text style={styles.warningText}>
              The online deposit must be fully paid before collecting
              the remaining balance.
            </Text>
          ) : (
            <>
              <View style={styles.cashDueBox}>
                <Text style={styles.cashDueLabel}>
                  Cash to Collect
                </Text>

                <Text style={styles.cashDueAmount}>
                  {formatMoney(cashBalance?.remainingAmount)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  savingCashPayment && styles.disabled,
                ]}
                onPress={recordCashBalancePayment}
                disabled={
                  savingCashPayment ||
                  !cashBalance ||
                  cashBalance.remainingAmount <= 0
                }
              >
                {savingCashPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    <Ionicons
                      name="cash-outline"
                      size={16}
                      color="#FFFFFF"
                    />{' '}
                    Record Cash Payment
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Customer Measurements
          </Text>
          <Ionicons name="body-outline" size={23} color={PINK} />
        </View>

        {!measurements ? (
          <View style={styles.measurementUnavailable}>
            <Ionicons
              name="alert-circle-outline"
              size={25}
              color="#C58B36"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.measurementUnavailableTitle}>
                Measurements Not Available
              </Text>

              <Text style={styles.measurementDescription}>
                Original measurements saved when this order was placed.
                These values remain unchanged even if the customer
                updates their profile.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.measurementDescription}>
              Original measurements saved when this order was placed.
              These values remain unchanged even if the customer
              updates their profile. All values are in centimeters.
            </Text>

            <View style={styles.measurementGrid}>
              {[
                { label: 'Shoulder', value: measurements.shoulder },
                { label: 'Chest', value: measurements.chest },
                { label: 'Waist', value: measurements.waist },
                {
                  label: 'Sleeve Length',
                  value: measurements.sleeve_length,
                },
                {
                  label: 'Top Length',
                  value: measurements.top_length,
                },
                { label: 'Hips', value: measurements.hips },
                { label: 'Inseam', value: measurements.inseam },
                {
                  label: 'Bottom Length',
                  value: measurements.bottom_length,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={styles.measurementItem}
                >
                  <Text style={styles.measurementLabel}>
                    {item.label}
                  </Text>

                  <Text style={styles.measurementValue}>
                    {item.value != null
                      ? `${item.value} cm`
                      : 'Not provided'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {orderType === 'catalog' && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ordered Garments</Text>
            <Ionicons
              name="shirt-outline"
              size={22}
              color={PINK}
            />
          </View>

          {catalogItems.length === 0 ? (
            <Text style={styles.muted}>
              No order items were found for this order.
            </Text>
          ) : (
            catalogItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemName}>
                  {item.garmentName}
                </Text>

                <View style={styles.imageRow}>
                  {item.garmentImage ? (
                    <Image
                      source={{ uri: item.garmentImage }}
                      style={styles.itemImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name="shirt-outline"
                        size={30}
                        color={PINK}
                      />
                      <Text style={styles.placeholderText}>
                        No garment image
                      </Text>
                    </View>
                  )}

                  {item.designImage ? (
                    <Image
                      source={{ uri: item.designImage }}
                      style={styles.itemImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons
                        name="color-palette-outline"
                        size={30}
                        color={PINK}
                      />
                      <Text style={styles.placeholderText}>
                        No design image
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.imageCaptionRow}>
                  <Text style={styles.imageCaption}>Garment</Text>
                  <Text style={styles.imageCaption}>Design</Text>
                </View>

                <InfoRow
                  label="Design Name"
                  value={item.designName}
                />
                <InfoRow
                  label="Garment Part"
                  value={item.partName}
                />
                <InfoRow
                  label="Fabric"
                  value={item.fabricName}
                />
                <InfoRow
                  label="Quantity"
                  value={String(item.quantity)}
                />
                <InfoRow
                  label="Unit Price"
                  value={formatMoney(item.unitPrice)}
                />

                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>
                    Item Subtotal
                  </Text>
                  <Text style={styles.subtotalValue}>
                    {formatMoney(item.subtotal)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {orderType === 'custom' && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Custom Order Details
            </Text>
            <Ionicons
              name="images-outline"
              size={22}
              color={PINK}
            />
          </View>

          <Text style={styles.fieldLabel}>
            Customer Reference Image
          </Text>

          {referenceImage ? (
            <Image
              source={{ uri: referenceImage }}
              style={styles.referenceImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholderLarge}>
              <Ionicons
                name="image-outline"
                size={38}
                color={PINK}
              />
              <Text style={styles.placeholderText}>
                Reference image not available
              </Text>
            </View>
          )}

          <InfoRow
            label="Garment Description"
            value={order.garment_description || 'Not specified'}
          />

          <InfoRow
            label="Preferred Color"
            value={order.preferred_color || 'Not specified'}
          />

          <InfoRow
            label="Fabric Preference"
            value={order.fabric_preference || 'Not specified'}
          />

          <InfoRow
            label="Quoted Price"
            value={formatMoney(order.quoted_price)}
          />

          <InfoRow
            label="Deposit Amount"
            value={formatMoney(order.deposit_amount)}
          />

          {!!order.quotation_note && (
            <View style={styles.noteBox}>
              <Text style={styles.infoLabel}>Quotation Note</Text>
              <Text style={styles.noteText}>
                {order.quotation_note}
              </Text>
            </View>
          )}

          {!!order.special_instructions && (
            <View style={styles.noteBox}>
              <Text style={styles.infoLabel}>
                Special Instructions
              </Text>
              <Text style={styles.noteText}>
                {order.special_instructions}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAILOR ASSIGNMENT */}
      {showAssignmentSection && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Tailor Assignment
            </Text>
            <Ionicons
              name="person-outline"
              size={22}
              color={PINK}
            />
          </View>

          {assignment ? (
            <View style={styles.assignedBox}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#23844D"
              />

              <View style={styles.assignedInfo}>
                <Text style={styles.assignedName}>
                  {tailors.find(
                    (t) => t.id === assignment.tailor_id
                  )?.full_name ?? 'Assigned tailor'}
                </Text>

                <Text style={styles.muted}>
                  {tailors.find(
                    (t) => t.id === assignment.tailor_id
                  )?.contact_number || 'No contact number'}
                </Text>

                <Text style={styles.assignedDate}>
                  Assigned: {formatDateTime(assignment.assigned_at)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.muted}>
              No tailor has been assigned to this order yet.
            </Text>
          )}

          {!canManageAssignment && (
            <Text style={styles.warningText}>
              {productionStatus === 'ready_for_pickup' ||
              productionStatus === 'completed'
                ? 'The tailor assignment is locked because this order is ready for pickup or completed.'
                : orderType === 'catalog'
                  ? 'Only Accepted catalog orders can receive an initial tailor assignment.'
                  : 'Only Accepted custom orders can receive an initial tailor assignment.'}
            </Text>
          )}

          {canManageAssignment && !depositPayment?.isPaid && (
            <Text style={styles.warningText}>
              Tailor assignment is locked until the required deposit is
              confirmed as paid.
            </Text>
          )}

          {canManageAssignment && depositPayment?.isPaid && (
            <>
              <Dropdown
                label="Select Tailor"
                value={selectedTailorId}
                placeholder="Choose an available tailor"
                options={tailorOptions.map((tailor) => ({
                  label: tailor.full_name,
                  value: tailor.id,
                  description: tailor.is_available
                    ? tailor.contact_number || 'Available'
                    : 'Currently unavailable',
                }))}
                onSelect={setSelectedTailorId}
                disabled={savingAssignment}
              />

              {availableTailors.length === 0 && (
                <Text style={styles.warningText}>
                  No available tailors. Please check Manage Tailors.
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (savingAssignment ||
                    !selectedTailorId ||
                    !selectedTailor?.is_available) &&
                    styles.disabled,
                ]}
                onPress={saveAssignment}
                disabled={
                  savingAssignment ||
                  !selectedTailorId ||
                  !selectedTailor?.is_available
                }
              >
                {savingAssignment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {assignment
                      ? 'Change Assigned Tailor'
                      : 'Assign Tailor'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* PRODUCTION TRACKING */}
      {showProductionSection && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Production Tracking
            </Text>
            <Ionicons
              name="construct-outline"
              size={22}
              color={PINK}
            />
          </View>

          <View style={styles.currentStage}>
            <Text style={styles.infoLabel}>
              Current Production Stage
            </Text>

            <Text style={styles.currentStageText}>
              {production
                ? getStageLabel(production.status)
                : 'Assigned'}
            </Text>
          </View>

          {!depositPayment?.isPaid ? (
            <Text style={styles.warningText}>
              Production updates are locked until the required deposit
              is confirmed as paid.
            </Text>
          ) : productionStatus === 'completed' ? (
            <Text style={styles.cashPaidDescription}>
              This order has been completed. Production updates are locked.
            </Text>
          ) : (
            <>
              <Dropdown
                label="Select Production Stage"
                value={selectedStage}
                placeholder="Choose a production stage"
                options={STAGES.map((stage) => ({
                  label: stage.label,
                  value: stage.value,
                }))}
                onSelect={(value) => {
                  setSelectedStage(value);
                  setShowFittingPicker(false);
                  setShowPickupPicker(false);
                  setShowFittingTimePicker(false);
                  setShowPickupTimePicker(false);
                }}
                disabled={savingStage}
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  savingStage && styles.disabled,
                ]}
                onPress={updateStage}
                disabled={savingStage}
              >
                {savingStage ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    Update Production Stage
                  </Text>
                )}
              </TouchableOpacity>

              {selectedStage === 'fitting' && (
                <View style={styles.scheduleBox}>
                  <View style={styles.scheduleHeader}>
                    <Ionicons
                      name="calendar-outline"
                      size={21}
                      color={PINK}
                    />
                    <Text style={styles.scheduleTitle}>
                      Fitting Appointment
                    </Text>
                  </View>

                  <Text style={styles.scheduleDescription}>
                    Select the date and time when the customer should
                    come for fitting.
                  </Text>

                  <Text style={styles.scheduleFieldLabel}>
                    Fitting Date
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowPickupPicker(false);
                      setShowPickupTimePicker(false);
                      setShowFittingPicker(true);
                    }}
                    disabled={savingSchedule}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={PINK}
                    />

                    <Text
                      style={
                        fittingDate
                          ? styles.dateValue
                          : styles.datePlaceholder
                      }
                    >
                      {formatSelectedDate(fittingDate)}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#98717E"
                    />
                  </TouchableOpacity>

                  {showFittingPicker && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={fittingDate ?? getToday()}
                        mode="date"
                        display={
                          Platform.OS === 'ios' ? 'spinner' : 'default'
                        }
                        minimumDate={getToday()}
                        onValueChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const nextDate = new Date(selectedDate);

                            if (fittingDate) {
                              nextDate.setHours(
                                fittingDate.getHours(),
                                fittingDate.getMinutes(),
                                0,
                                0
                              );
                            } else {
                              nextDate.setHours(9, 0, 0, 0);
                            }

                            setFittingDate(nextDate);

                            if (
                              pickupDate &&
                              pickupDate.getTime() <
                                nextDate.getTime()
                            ) {
                              setPickupDate(null);
                            }
                          }

                          if (Platform.OS === 'android') {
                            setShowFittingPicker(false);
                          }
                        }}
                        onDismiss={() => {
                          setShowFittingPicker(false);
                        }}
                      />

                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneButton}
                          onPress={() =>
                            setShowFittingPicker(false)
                          }
                        >
                          <Text style={styles.pickerDoneText}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.scheduleFieldLabel}>
                    Fitting Time
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      if (!fittingDate) {
                        const defaultDate = getToday();
                        defaultDate.setHours(9, 0, 0, 0);
                        setFittingDate(defaultDate);
                      }

                      setShowFittingTimePicker(true);
                    }}
                    disabled={savingSchedule}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={PINK}
                    />

                    <Text
                      style={
                        fittingDate
                          ? styles.dateValue
                          : styles.datePlaceholder
                      }
                    >
                      {formatSelectedTime(fittingDate)}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#98717E"
                    />
                  </TouchableOpacity>

                  {showFittingTimePicker && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={fittingDate ?? new Date()}
                        mode="time"
                        display={
                          Platform.OS === 'ios' ? 'spinner' : 'default'
                        }
                        onValueChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const nextDate = new Date(
                              fittingDate ?? getToday()
                            );

                            nextDate.setHours(
                              selectedDate.getHours(),
                              selectedDate.getMinutes(),
                              0,
                              0
                            );

                            setFittingDate(nextDate);

                            if (
                              pickupDate &&
                              pickupDate.getTime() <
                                nextDate.getTime()
                            ) {
                              setPickupDate(null);
                            }
                          }

                          if (Platform.OS === 'android') {
                            setShowFittingTimePicker(false);
                          }
                        }}
                        onDismiss={() => {
                          setShowFittingTimePicker(false);
                        }}
                      />

                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneButton}
                          onPress={() =>
                            setShowFittingTimePicker(false)
                          }
                        >
                          <Text style={styles.pickerDoneText}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.selectedScheduleText}>
                    Selected: {formatSelectedDateTime(fittingDate)}
                  </Text>

                  <Text style={styles.savedScheduleText}>
                    Saved fitting schedule:{' '}
                    {formatDateTime(order.fitting_date)}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      savingSchedule && styles.disabled,
                    ]}
                    onPress={saveSchedule}
                    disabled={savingSchedule}
                  >
                    {savingSchedule ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        Save Fitting Schedule
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {selectedStage === 'ready_for_pickup' && (
                <View style={styles.scheduleBox}>
                  <View style={styles.scheduleHeader}>
                    <Ionicons
                      name="bag-check-outline"
                      size={21}
                      color={PINK}
                    />
                    <Text style={styles.scheduleTitle}>
                      Pickup Appointment
                    </Text>
                  </View>

                  <Text style={styles.scheduleDescription}>
                    Select the date and time when the customer can
                    collect the finished garment.
                  </Text>

                  <Text style={styles.scheduleFieldLabel}>
                    Pickup Date
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowFittingPicker(false);
                      setShowFittingTimePicker(false);
                      setShowPickupPicker(true);
                    }}
                    disabled={savingSchedule}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={PINK}
                    />

                    <Text
                      style={
                        pickupDate
                          ? styles.dateValue
                          : styles.datePlaceholder
                      }
                    >
                      {formatSelectedDate(pickupDate)}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#98717E"
                    />
                  </TouchableOpacity>

                  {showPickupPicker && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={
                          pickupDate ?? getMinimumPickupDate()
                        }
                        mode="date"
                        display={
                          Platform.OS === 'ios' ? 'spinner' : 'default'
                        }
                        minimumDate={getMinimumPickupDate()}
                        onValueChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const nextDate = new Date(selectedDate);

                            if (pickupDate) {
                              nextDate.setHours(
                                pickupDate.getHours(),
                                pickupDate.getMinutes(),
                                0,
                                0
                              );
                            } else {
                              nextDate.setHours(16, 0, 0, 0);
                            }

                            setPickupDate(nextDate);
                          }

                          if (Platform.OS === 'android') {
                            setShowPickupPicker(false);
                          }
                        }}
                        onDismiss={() => {
                          setShowPickupPicker(false);
                        }}
                      />

                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneButton}
                          onPress={() =>
                            setShowPickupPicker(false)
                          }
                        >
                          <Text style={styles.pickerDoneText}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.scheduleFieldLabel}>
                    Pickup Time
                  </Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      if (!pickupDate) {
                        const defaultDate = getMinimumPickupDate();
                        defaultDate.setHours(16, 0, 0, 0);
                        setPickupDate(defaultDate);
                      }

                      setShowPickupTimePicker(true);
                    }}
                    disabled={savingSchedule}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={PINK}
                    />

                    <Text
                      style={
                        pickupDate
                          ? styles.dateValue
                          : styles.datePlaceholder
                      }
                    >
                      {formatSelectedTime(pickupDate)}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#98717E"
                    />
                  </TouchableOpacity>

                  {showPickupTimePicker && (
                    <View style={styles.pickerContainer}>
                      <DateTimePicker
                        value={
                          pickupDate ?? getMinimumPickupDate()
                        }
                        mode="time"
                        display={
                          Platform.OS === 'ios' ? 'spinner' : 'default'
                        }
                        onValueChange={(event, selectedDate) => {
                          if (selectedDate) {
                            const nextDate = new Date(
                              pickupDate ?? getMinimumPickupDate()
                            );

                            nextDate.setHours(
                              selectedDate.getHours(),
                              selectedDate.getMinutes(),
                              0,
                              0
                            );

                            setPickupDate(nextDate);
                          }

                          if (Platform.OS === 'android') {
                            setShowPickupTimePicker(false);
                          }
                        }}
                        onDismiss={() => {
                          setShowPickupTimePicker(false);
                        }}
                      />

                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.pickerDoneButton}
                          onPress={() =>
                            setShowPickupTimePicker(false)
                          }
                        >
                          <Text style={styles.pickerDoneText}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.selectedScheduleText}>
                    Selected: {formatSelectedDateTime(pickupDate)}
                  </Text>

                  <Text style={styles.savedScheduleText}>
                    Saved pickup schedule:{' '}
                    {formatDateTime(order.pickup_date)}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      savingSchedule && styles.disabled,
                    ]}
                    onPress={saveSchedule}
                    disabled={savingSchedule}
                  >
                    {savingSchedule ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        Save Pickup Schedule
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {production?.started_at && (
            <InfoRow
              label="Production Started"
              value={formatDateTime(production.started_at)}
            />
          )}

          {production?.completed_at && (
            <InfoRow
              label="Completed"
              value={formatDateTime(production.completed_at)}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
    padding: 20,
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#3F2630',
  },
  subtitle: {
    fontSize: 12,
    color: '#8C6674',
    marginTop: 5,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F0E2E7',
    padding: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#49323B',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3F2630',
  },
  orderId: {
    color: '#98717E',
    fontSize: 10,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3DF',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  statusText: {
    color: '#98661D',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF0',
  },
  infoLabel: {
    color: '#98717E',
    fontSize: 12,
    flex: 1,
  },
  infoValue: {
    flex: 1.3,
    textAlign: 'right',
    color: '#49323B',
    fontSize: 12,
    fontWeight: '700',
  },
  muted: {
    color: '#98717E',
    fontSize: 11,
    marginTop: 5,
  },
  scheduleBox: {
    backgroundColor: '#FFFBFC',
    borderWidth: 1,
    borderColor: '#F0DCE4',
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#49323B',
  },
  scheduleDescription: {
    color: '#98717E',
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 10,
  },
  scheduleFieldLabel: {
    color: '#49323B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD5DE',
    backgroundColor: '#FFFBFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  dateValue: {
    flex: 1,
    color: '#49323B',
    fontSize: 13,
    fontWeight: '700',
  },
  datePlaceholder: {
    flex: 1,
    color: '#98717E',
    fontSize: 13,
  },
  pickerContainer: {
    backgroundColor: '#FFF4F7',
    borderRadius: 10,
    marginTop: 10,
    padding: 8,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  pickerDoneText: {
    color: PINK,
    fontSize: 13,
    fontWeight: '800',
  },
  savedScheduleText: {
    color: '#98717E',
    fontSize: 11,
    marginTop: 10,
  },
  selectedScheduleText: {
    color: '#B84470',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 11,
    padding: 11,
    marginBottom: 12,
  },
  itemName: {
    color: '#49323B',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  itemImage: {
    flex: 1,
    height: 145,
    borderRadius: 9,
    backgroundColor: '#FFF4F7',
  },
  imagePlaceholder: {
    flex: 1,
    height: 145,
    borderRadius: 9,
    backgroundColor: '#FFF4F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderText: {
    fontSize: 10,
    color: '#98717E',
    textAlign: 'center',
    marginTop: 7,
  },
  imageCaptionRow: {
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 8,
  },
  imageCaption: {
    flex: 1,
    textAlign: 'center',
    color: '#98717E',
    fontSize: 10,
    fontWeight: '700',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F0E2E7',
  },
  subtotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#49323B',
  },
  subtotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B84470',
  },
  referenceImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#FFF4F7',
    borderRadius: 10,
    marginBottom: 14,
  },
  imagePlaceholderLarge: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFF4F7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noteBox: {
    backgroundColor: '#FFF8FA',
    borderRadius: 9,
    padding: 11,
    marginTop: 12,
  },
  noteText: {
    color: '#65424F',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  assignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFFAF2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  assignedInfo: {
    marginLeft: 9,
    flex: 1,
  },
  assignedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#286B43',
  },
  assignedDate: {
    color: '#568368',
    fontSize: 10,
    marginTop: 5,
  },
  warningText: {
    color: '#A66A1C',
    backgroundColor: '#FFF6E8',
    padding: 10,
    borderRadius: 8,
    fontSize: 11,
    marginTop: 10,
  },
  fieldLabel: {
    color: '#49323B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 15,
    marginBottom: 9,
  },
  primaryButton: {
    backgroundColor: PINK,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
  },
  disabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  currentStage: {
    backgroundColor: '#FFF4F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 5,
  },
  currentStageText: {
    color: '#B84470',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },
  dropdownContainer: {
    marginTop: 13,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAD5DE',
    backgroundColor: '#FFFBFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  dropdownValue: {
    color: '#49323B',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownPlaceholder: {
    color: '#98717E',
    fontSize: 13,
  },
  dropdownDescription: {
    color: '#98717E',
    fontSize: 10,
    marginTop: 3,
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#FFF1F5',
  },
  dropdownOptionText: {
    color: '#49323B',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownOptionTextSelected: {
    color: '#B84470',
    fontWeight: '800',
  },
  emptyDropdown: {
    padding: 13,
    color: '#98717E',
    fontSize: 11,
  },
  measurementDescription: {
    color: '#98717E',
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 12,
  },
  measurementUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
    padding: 12,
  },
  measurementUnavailableTitle: {
    color: '#49323B',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  measurementItem: {
    width: '48%',
    backgroundColor: '#FFF4F7',
    borderRadius: 9,
    padding: 11,
  },
  measurementLabel: {
    color: '#98717E',
    fontSize: 11,
    marginBottom: 5,
  },
  measurementValue: {
    color: '#49323B',
    fontSize: 13,
    fontWeight: '800',
  },
  cashDueBox: {
    backgroundColor: '#FFF1F5',
    borderWidth: 1,
    borderColor: '#F0D1DD',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
  },
  cashDueLabel: {
    color: '#98717E',
    fontSize: 11,
    fontWeight: '700',
  },
  cashDueAmount: {
    color: '#B84470',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 5,
  },
  cashPaidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFFAF2',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  cashPaidTitle: {
    color: '#286B43',
    fontSize: 13,
    fontWeight: '800',
  },
  cashPaidDescription: {
    color: '#568368',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
});