
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
          <Text style={selected ? styles.dropdownValue : styles.dropdownPlaceholder}>
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
            <Text style={styles.emptyDropdown}>No options available.</Text>
          ) : (
            options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  value === option.value && styles.dropdownOptionSelected,
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
                      value === option.value && styles.dropdownOptionTextSelected,
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
                  <Ionicons name="checkmark-circle" size={19} color={PINK} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const getField = (record: any, keys: string[], fallback: any = null) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
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
  const [measurements, setMeasurements] = useState<Measurement | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [production, setProduction] = useState<ProductionRecord | null>(null);

  const [selectedTailorId, setSelectedTailorId] = useState('');
  const [selectedStage, setSelectedStage] = useState('assigned');

  // Schedule states
  const [fittingDate, setFittingDate] = useState<Date | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);

  const [showFittingPicker, setShowFittingPicker] = useState(false);
  const [showPickupPicker, setShowPickupPicker] = useState(false);

  const [savingSchedule, setSavingSchedule] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingStage, setSavingStage] = useState(false);

  const isEligible =
    orderType === 'catalog'
      ? String(order?.status ?? '').toLowerCase() === 'pending'
      : String(order?.status ?? '').toLowerCase() === 'accepted';

  const formatMoney = (amount: number | string | null | undefined) => {
    if (amount == null || amount === '') return 'Not available';

    const value = Number(amount);
    if (!Number.isFinite(value)) return 'Not available';

    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not specified';

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
      ? 'Not specified'
      : parsed.toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
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

  const getStageLabel = (value: string) =>
    STAGES.find((stage) => stage.value === value)?.label ?? value;

  // Load custom order reference image.
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

  // Load catalog order items.
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
        rows.map((item: any) => getId(item, ['garment_id'])).filter(Boolean)
      ),
    ] as string[];

    const designIds = [
      ...new Set(
        rows
          .map((item: any) => getId(item, ['design_id', 'selected_design_id']))
          .filter(Boolean)
      ),
    ] as string[];

    const fabricIds = [
      ...new Set(
        rows.map((item: any) => getId(item, ['fabric_id'])).filter(Boolean)
      ),
    ] as string[];

    const partIds = [
      ...new Set(
        rows
          .map((item: any) => getId(item, ['garment_part_id', 'part_id']))
          .filter(Boolean)
      ),
    ] as string[];

    const [garmentResult, designResult, fabricResult, partResult] =
      await Promise.all([
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

      const designId = getId(item, ['design_id', 'selected_design_id']);
      const fabricId = getId(item, ['fabric_id']);
      const partId = getId(item, ['garment_part_id', 'part_id']);

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
        getField(item, ['subtotal', 'total_price'], quantity * unitPrice)
      );

      return {
        id: String(item.id),
        garmentName:
          getField(item, ['garment_name', 'name'], garment?.name) ?? 'Garment',
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
          getField(item, ['design_image_url'], design?.image_url) ?? null,
        partName:
          getField(item, ['part_name'], part?.name) ?? 'Not specified',
        fabricName:
          getField(item, ['fabric_name'], fabric?.name) ?? 'Not specified',
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

      const [orderResult, tailorResult, assignmentResult, productionResult] =
        await Promise.all([
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
      const productionData = productionResult.data as ProductionRecord | null;

      setOrder(orderData);
      setTailors((tailorResult.data ?? []) as Tailor[]);
      setAssignment(assigned);
      setProduction(productionData);

      setSelectedTailorId(assigned?.tailor_id ?? '');
      setSelectedStage(productionData?.status ?? 'assigned');

      setFittingDate(
        orderData.fitting_date ? new Date(orderData.fitting_date) : null
      );

      setPickupDate(
        orderData.pickup_date ? new Date(orderData.pickup_date) : null
      );

      // Load customer details.
      const customerId =
        orderType === 'catalog' ? orderData.customer_id : orderData.user_id;

      if (customerId) {
        const { data: customerData, error: customerError } = await supabase
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

      // Load measurements.
      if (orderType === 'catalog') {
        setMeasurements(null);

        if (orderData.measurement_id) {
          const { data: measurementData, error: measurementError } =
            await supabase
              .from('measurements')
              .select(`
                shoulder,
                chest,
                waist,
                sleeve_length,
                top_length,
                hips,
                inseam,
                bottom_length
              `)
              .eq('id', orderData.measurement_id)
              .maybeSingle();

          if (measurementError) {
            console.log('Measurement details:', measurementError.message);
          }

          setMeasurements((measurementData as Measurement | null) ?? null);
        }
      } else {
        setMeasurements(null);
      }

      // Load catalog items / custom reference image.
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

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const availableTailors = tailors.filter((tailor) => tailor.is_available);

  const tailorOptions = [
    ...availableTailors,
    ...tailors.filter(
      (tailor) =>
        !tailor.is_available && tailor.id === assignment?.tailor_id
    ),
  ];

  const selectedTailor = tailors.find(
    (tailor) => tailor.id === selectedTailorId
  );

  // Save only the schedule related to the selected production stage.
  const saveSchedule = async () => {
    let fieldToUpdate: 'fitting_date' | 'pickup_date';
    let selectedDate: Date | null;

    if (selectedStage === 'fitting') {
      fieldToUpdate = 'fitting_date';
      selectedDate = fittingDate;

      if (!selectedDate) {
        Alert.alert(
          'Select Fitting Date',
          'Please select a fitting appointment date.'
        );
        return;
      }

      if (pickupDate && selectedDate > pickupDate) {
        Alert.alert(
          'Invalid Schedule',
          'Fitting date cannot be later than the already scheduled pickup date.'
        );
        return;
      }
    } else if (selectedStage === 'ready_for_pickup') {
      fieldToUpdate = 'pickup_date';
      selectedDate = pickupDate;

      if (!selectedDate) {
        Alert.alert(
          'Select Pickup Date',
          'Please select a pickup appointment date.'
        );
        return;
      }

      const minimumPickupDate = fittingDate
        ? new Date(fittingDate)
        : null;

      if (minimumPickupDate && selectedDate < minimumPickupDate) {
        Alert.alert(
          'Invalid Schedule',
          'Pickup date cannot be earlier than the fitting date.'
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
          ? await supabase.from('orders').update(values).eq('id', orderId)
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
    if (!isEligible) {
      Alert.alert(
        'Assignment Not Allowed',
        orderType === 'catalog'
          ? 'Only Pending catalog orders can receive a new or changed tailor assignment.'
          : 'Only Accepted custom orders can receive a new or changed tailor assignment.'
      );
      return;
    }

    if (!selectedTailorId) {
      Alert.alert('Select a Tailor', 'Please select a tailor first.');
      return;
    }

    if (!selectedTailor?.is_available) {
      Alert.alert('Tailor Unavailable', 'Please select an available tailor.');
      return;
    }

    setSavingAssignment(true);

    try {
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
        custom_order_id: orderType === 'custom' ? orderId : null,
        assigned_by: user.id,
        assigned_at: now,
      };

      const result = assignment
        ? await supabase
            .from('tailor_assignments')
            .update(values)
            .eq('id', assignment.id)
        : await supabase.from('tailor_assignments').insert(values);

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
      Alert.alert('Select a Stage', 'Please select a production stage.');
      return;
    }

    setSavingStage(true);

    try {
      const now = new Date().toISOString();

      const values: any = {
        tailor_id: assignment.tailor_id,
        order_id: orderType === 'catalog' ? orderId : null,
        custom_order_id: orderType === 'custom' ? orderId : null,
        status: selectedStage,
        updated_at: now,
      };

      if (selectedStage === 'cutting' && !production?.started_at) {
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
        : await supabase.from('production_tracking').insert(values);

      if (result.error) throw result.error;

      Alert.alert(
        'Success',
        `Production stage updated to ${getStageLabel(selectedStage)}.`
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
    orderType === 'catalog' ? order?.total_amount : order?.quoted_price;

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

        <TouchableOpacity style={styles.primaryButton} onPress={loadData}>
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
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.heading}>Manage Order</Text>

        <Text style={styles.subtitle}>
          View order details, assign a tailor, update production progress,
          and schedule fitting and pickup.
        </Text>
      </View>

      {/* CUSTOMER INFORMATION */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Ionicons name="person-circle-outline" size={23} color={PINK} />
        </View>

        <InfoRow
          label="Customer Name"
          value={customer?.full_name || customer?.username || 'Not available'}
        />

        <InfoRow label="Email" value={customer?.email || 'Not available'} />

        <InfoRow
          label="Contact Number"
          value={customer?.contact_number || 'Not available'}
        />
      </View>

      {/* ORDER INFORMATION */}
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
          value={orderType === 'catalog' ? 'Catalog Order' : 'Custom Order'}
        />

        <InfoRow
          label={orderType === 'catalog' ? 'Order Total' : 'Quoted Price'}
          value={formatMoney(orderAmount)}
        />

        <InfoRow
          label="Date Submitted"
          value={formatDate(order.created_at)}
        />

        {orderType === 'custom' && (
          <>
            <InfoRow
              label="Deposit Amount"
              value={formatMoney(order.deposit_amount)}
            />

            <InfoRow
              label="Needed By"
              value={formatDate(order.needed_by_date)}
            />

            <InfoRow
              label="Estimated Completion"
              value={formatDate(order.estimated_completion_date)}
            />
          </>
        )}
      </View>

      {/* MEASUREMENTS */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer Measurements</Text>
          <Ionicons name="body-outline" size={23} color={PINK} />
        </View>

        {orderType === 'custom' ? (
          <View style={styles.measurementUnavailable}>
            <Ionicons name="information-circle-outline" size={25} color={PINK} />

            <View style={{ flex: 1 }}>
              <Text style={styles.measurementUnavailableTitle}>
                Measurements Not Yet Available
              </Text>

              <Text style={styles.measurementDescription}>
                Measurements for custom orders are not yet connected to the
                saved customer measurement profile.
              </Text>
            </View>
          </View>
        ) : !order.measurement_id ? (
          <View style={styles.measurementUnavailable}>
            <Ionicons name="alert-circle-outline" size={25} color="#C58B36" />

            <View style={{ flex: 1 }}>
              <Text style={styles.measurementUnavailableTitle}>
                No Measurements Linked
              </Text>

              <Text style={styles.measurementDescription}>
                This catalog order does not have a linked measurement record.
              </Text>
            </View>
          </View>
        ) : !measurements ? (
          <View style={styles.measurementUnavailable}>
            <Ionicons name="alert-circle-outline" size={25} color="#C58B36" />

            <View style={{ flex: 1 }}>
              <Text style={styles.measurementUnavailableTitle}>
                Measurements Not Found
              </Text>

              <Text style={styles.measurementDescription}>
                The linked measurement record could not be loaded. Please
                check the customer's measurement record.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.measurementDescription}>
              Measurements linked to this catalog order. All values are in
              inches.
            </Text>

            <View style={styles.measurementGrid}>
              {[
                { label: 'Shoulder', value: measurements.shoulder },
                { label: 'Chest', value: measurements.chest },
                { label: 'Waist', value: measurements.waist },
                { label: 'Sleeve Length', value: measurements.sleeve_length },
                { label: 'Top Length', value: measurements.top_length },
                { label: 'Hips', value: measurements.hips },
                { label: 'Inseam', value: measurements.inseam },
                { label: 'Bottom Length', value: measurements.bottom_length },
              ].map((item) => (
                <View key={item.label} style={styles.measurementItem}>
                  <Text style={styles.measurementLabel}>{item.label}</Text>

                  <Text style={styles.measurementValue}>
                    {item.value != null ? `${item.value} in` : 'Not provided'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* CATALOG ORDER ITEMS */}
      {orderType === 'catalog' && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ordered Garments</Text>
            <Ionicons name="shirt-outline" size={22} color={PINK} />
          </View>

          {catalogItems.length === 0 ? (
            <Text style={styles.muted}>
              No order items were found for this order.
            </Text>
          ) : (
            catalogItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemName}>{item.garmentName}</Text>

                <View style={styles.imageRow}>
                  {item.garmentImage ? (
                    <Image
                      source={{ uri: item.garmentImage }}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="shirt-outline" size={30} color={PINK} />
                      <Text style={styles.placeholderText}>
                        No garment image
                      </Text>
                    </View>
                  )}

                  {item.designImage ? (
                    <Image
                      source={{ uri: item.designImage }}
                      style={styles.itemImage}
                      resizeMode="cover"
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

                <InfoRow label="Design Name" value={item.designName} />
                <InfoRow label="Garment Part" value={item.partName} />
                <InfoRow label="Fabric" value={item.fabricName} />
                <InfoRow label="Quantity" value={String(item.quantity)} />

                <InfoRow
                  label="Unit Price"
                  value={formatMoney(item.unitPrice)}
                />

                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Item Subtotal</Text>
                  <Text style={styles.subtotalValue}>
                    {formatMoney(item.subtotal)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* CUSTOM ORDER DETAILS */}
      {orderType === 'custom' && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Order Details</Text>
            <Ionicons name="images-outline" size={22} color={PINK} />
          </View>

          <Text style={styles.fieldLabel}>Customer Reference Image</Text>

          {referenceImage ? (
            <Image
              source={{ uri: referenceImage }}
              style={styles.referenceImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholderLarge}>
              <Ionicons name="image-outline" size={38} color={PINK} />
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
              <Text style={styles.noteText}>{order.quotation_note}</Text>
            </View>
          )}

          {!!order.special_instructions && (
            <View style={styles.noteBox}>
              <Text style={styles.infoLabel}>Special Instructions</Text>
              <Text style={styles.noteText}>
                {order.special_instructions}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* TAILOR ASSIGNMENT */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tailor Assignment</Text>
          <Ionicons name="person-outline" size={22} color={PINK} />
        </View>

        {assignment ? (
          <View style={styles.assignedBox}>
            <Ionicons name="checkmark-circle" size={22} color="#23844D" />

            <View style={styles.assignedInfo}>
              <Text style={styles.assignedName}>
                {tailors.find((t) => t.id === assignment.tailor_id)
                  ?.full_name ?? 'Assigned tailor'}
              </Text>

              <Text style={styles.muted}>
                {tailors.find((t) => t.id === assignment.tailor_id)
                  ?.contact_number || 'No contact number'}
              </Text>

              <Text style={styles.assignedDate}>
                Assigned: {formatDate(assignment.assigned_at)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>
            No tailor has been assigned to this order yet.
          </Text>
        )}

        {!isEligible && (
          <Text style={styles.warningText}>
            {orderType === 'catalog'
              ? 'Only Pending catalog orders can receive a new or changed tailor assignment.'
              : 'Only Accepted custom orders can receive a new or changed tailor assignment.'}
          </Text>
        )}

        {isEligible && (
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
                  {assignment ? 'Change Assigned Tailor' : 'Assign Tailor'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* PRODUCTION TRACKING */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Production Tracking</Text>
          <Ionicons name="construct-outline" size={22} color={PINK} />
        </View>

        <View style={styles.currentStage}>
          <Text style={styles.infoLabel}>Current Production Stage</Text>

          <Text style={styles.currentStageText}>
            {production
              ? getStageLabel(production.status)
              : assignment
                ? 'Assigned'
                : 'Not Started'}
          </Text>
        </View>

        {!assignment ? (
          <Text style={styles.muted}>
            Assign a tailor before updating the production stage.
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

            {/* FITTING SCHEDULER: ONLY WHEN FITTING IS SELECTED */}
            {selectedStage === 'fitting' && (
              <View style={styles.scheduleBox}>
                <View style={styles.scheduleHeader}>
                  <Ionicons name="calendar-outline" size={21} color={PINK} />
                  <Text style={styles.scheduleTitle}>
                    Fitting Appointment
                  </Text>
                </View>

                <Text style={styles.scheduleDescription}>
                  Select the date when the customer should come for fitting.
                </Text>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowFittingPicker(true)}
                  disabled={savingSchedule}
                >
                  <Ionicons name="calendar-outline" size={20} color={PINK} />

                  <Text
                    style={
                      fittingDate ? styles.dateValue : styles.datePlaceholder
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
                      value={fittingDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onValueChange={(_event, selectedDate) => {
                        if (selectedDate) {
                          setFittingDate(selectedDate);
                        }

                        if (Platform.OS === 'android') {
                          setShowFittingPicker(false);
                        }
                      }}
                      onDismiss={() => setShowFittingPicker(false)}
                      onNeutralButtonPress={() => {
                        setFittingDate(null);
                        setShowFittingPicker(false);
                      }}
                    />

                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowFittingPicker(false)}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={styles.savedScheduleText}>
                  Saved fitting date: {formatSelectedDate(order.fitting_date ? new Date(order.fitting_date) : null)}
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

            {/* PICKUP SCHEDULER: ONLY WHEN READY FOR PICKUP IS SELECTED */}
            {selectedStage === 'ready_for_pickup' && (
              <View style={styles.scheduleBox}>
                <View style={styles.scheduleHeader}>
                  <Ionicons name="bag-check-outline" size={21} color={PINK} />
                  <Text style={styles.scheduleTitle}>
                    Pickup Appointment
                  </Text>
                </View>

                <Text style={styles.scheduleDescription}>
                  Select the date when the customer can collect the finished
                  garment.
                </Text>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowPickupPicker(true)}
                  disabled={savingSchedule}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={PINK}
                  />

                  <Text
                    style={
                      pickupDate ? styles.dateValue : styles.datePlaceholder
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
                      value={pickupDate || fittingDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={fittingDate || new Date()}
                      onValueChange={(_event, selectedDate) => {
                        if (selectedDate) {
                          setPickupDate(selectedDate);
                        }

                        if (Platform.OS === 'android') {
                          setShowPickupPicker(false);
                        }
                      }}
                      onDismiss={() => setShowPickupPicker(false)}
                      onNeutralButtonPress={() => {
                        setPickupDate(null);
                        setShowPickupPicker(false);
                      }}
                    />

                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowPickupPicker(false)}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={styles.savedScheduleText}>
                  Saved pickup date: {formatSelectedDate(order.pickup_date ? new Date(order.pickup_date) : null)}
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
            value={formatDate(production.started_at)}
          />
        )}

        {production?.completed_at && (
          <InfoRow
            label="Completed"
            value={formatDate(production.completed_at)}
          />
        )}
      </View>
    </ScrollView>
  );
}

// Reusable information row.
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

  /* SCHEDULING */

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
});
