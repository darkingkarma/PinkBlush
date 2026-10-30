
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

type OrderType = 'catalog' | 'custom';

type CatalogOrder = {
  id: string;
  status: string;
  total_amount: number | string;
  created_at: string;
};

type CustomOrder = {
  id: string;
  status: string;
  garment_description: string | null;
  quoted_price: number | string | null;
  created_at: string;
};

type Tailor = {
  id: string;
  full_name: string;
  contact_number: string | null;
  is_available: boolean;
};

type Assignment = {
  id: string;
  tailor_id: string;
  order_id: string | null;
  custom_order_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
};

type SelectedOrder = {
  id: string;
  type: OrderType;
  title: string;
  detail: string;
};

type AssignmentCard = {
  id: string;
  type: OrderType;
  title: string;
  detail: string;
  status: string;
  amount: number | null;
  created_at: string;
  assignment: Assignment | null;
};

const PINK = '#D96B8A';

export default function TailorAssignmentsScreen() {
  const [catalogOrders, setCatalogOrders] = useState<CatalogOrder[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedType, setSelectedType] =
    useState<OrderType>('catalog');

  const [selectedOrder, setSelectedOrder] =
    useState<SelectedOrder | null>(null);

  const [selectedTailorId, setSelectedTailorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const [
        catalogResult,
        customResult,
        tailorResult,
        assignmentResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .ilike('status', 'pending')
          .order('created_at', { ascending: false }),

        supabase
          .from('custom_orders')
          .select(
            'id, status, garment_description, quoted_price, created_at'
          )
          .eq('status', 'accepted')
          .order('created_at', { ascending: false }),

        supabase
          .from('tailors')
          .select(
            'id, full_name, contact_number, is_available'
          )
          .order('full_name', { ascending: true }),

        supabase
          .from('tailor_assignments')
          .select(
            'id, tailor_id, order_id, custom_order_id, assigned_by, assigned_at'
          ),
      ]);

      const error =
        catalogResult.error ||
        customResult.error ||
        tailorResult.error ||
        assignmentResult.error;

      if (error) {
        Alert.alert('Unable to Load Data', error.message);
        return;
      }

      setCatalogOrders(
        (catalogResult.data ?? []) as CatalogOrder[]
      );

      setCustomOrders(
        (customResult.data ?? []) as CustomOrder[]
      );

      setTailors((tailorResult.data ?? []) as Tailor[]);

      setAssignments(
        (assignmentResult.data ?? []) as Assignment[]
      );
    } catch {
      Alert.alert(
        'Error',
        'Something went wrong while loading tailor assignments.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return 'Unknown date';

    return parsed.toLocaleDateString();
  };

  const formatAmount = (amount: number | string | null) => {
    if (amount === null || amount === '') return 'Not quoted';

    const value = Number(amount);

    if (!Number.isFinite(value)) return 'Not available';

    return `₱${value.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const findAssignment = (
    orderId: string,
    type: OrderType
  ) => {
    return (
      assignments.find((item) =>
        type === 'catalog'
          ? item.order_id === orderId
          : item.custom_order_id === orderId
      ) ?? null
    );
  };

  const findTailor = (tailorId: string) => {
    return tailors.find((item) => item.id === tailorId);
  };

  const openAssignment = (order: SelectedOrder) => {
    const existing = findAssignment(order.id, order.type);

    setSelectedOrder(order);
    setSelectedTailorId(existing?.tailor_id ?? '');
  };

  const closeAssignment = () => {
    if (saving) return;

    setSelectedOrder(null);
    setSelectedTailorId('');
  };

  const saveAssignment = async () => {
    if (!selectedOrder) return;

    if (!selectedTailorId) {
      Alert.alert(
        'Select a Tailor',
        'Please select an available tailor first.'
      );
      return;
    }

    const tailor = tailors.find(
      (item) => item.id === selectedTailorId
    );

    if (!tailor || !tailor.is_available) {
      Alert.alert(
        'Tailor Unavailable',
        'Please select a tailor who is currently available.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Login Required',
          'Your staff session could not be verified. Please log in again.'
        );
        return;
      }

      const existing = findAssignment(
        selectedOrder.id,
        selectedOrder.type
      );

      const values = {
        tailor_id: selectedTailorId,
        order_id:
          selectedOrder.type === 'catalog'
            ? selectedOrder.id
            : null,
        custom_order_id:
          selectedOrder.type === 'custom'
            ? selectedOrder.id
            : null,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      };

      const result = existing
        ? await supabase
            .from('tailor_assignments')
            .update(values)
            .eq('id', existing.id)
        : await supabase
            .from('tailor_assignments')
            .insert(values);

      if (result.error) {
        Alert.alert(
          'Assignment Failed',
          result.error.message
        );
        return;
      }

      setSelectedOrder(null);
      setSelectedTailorId('');

      await loadData(false);

      Alert.alert(
        'Success',
        `${tailor.full_name} has been assigned to this ${
          selectedOrder.type === 'catalog'
            ? 'catalog order'
            : 'custom order'
        }.`
      );
    } catch {
      Alert.alert(
        'Error',
        'Unable to save the tailor assignment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const catalogCards: AssignmentCard[] = catalogOrders.map(
    (order) => ({
      id: order.id,
      type: 'catalog',
      title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
      detail: 'Catalog Order',
      status: order.status,
      amount: Number(order.total_amount),
      created_at: order.created_at,
      assignment: findAssignment(order.id, 'catalog'),
    })
  );

  const customCards: AssignmentCard[] = customOrders.map(
    (order) => ({
      id: order.id,
      type: 'custom',
      title: order.garment_description?.trim()
        ? order.garment_description.trim()
        : `Custom Order #${order.id.slice(0, 8).toUpperCase()}`,
      detail: `Request #${order.id.slice(0, 8).toUpperCase()}`,
      status: order.status,
      amount:
        order.quoted_price === null
          ? null
          : Number(order.quoted_price),
      created_at: order.created_at,
      assignment: findAssignment(order.id, 'custom'),
    })
  );

  const cards =
    selectedType === 'catalog' ? catalogCards : customCards;

  const availableTailors = tailors.filter(
    (tailor) => tailor.is_available
  );

  const assignedCount = cards.filter(
    (card) => card.assignment !== null
  ).length;

  const renderOrder = ({ item }: { item: AssignmentCard }) => {
    const assignedTailor = item.assignment
      ? findTailor(item.assignment.tailor_id)
      : undefined;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.orderIcon}>
            <Ionicons
              name={
                item.type === 'catalog'
                  ? 'bag-handle-outline'
                  : 'shirt-outline'
              }
              size={24}
              color={PINK}
            />
          </View>

          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>
              {item.title}
            </Text>

            <Text style={styles.orderDetail}>
              {item.detail}
            </Text>

            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="cash-outline"
            size={17}
            color="#98717E"
          />
          <Text style={styles.infoText}>
            {formatAmount(item.amount)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="calendar-outline"
            size={17}
            color="#98717E"
          />
          <Text style={styles.infoText}>
            Created {formatDate(item.created_at)}
          </Text>
        </View>

        <View style={styles.assignmentBox}>
          <View style={styles.assignmentHeading}>
            <Ionicons
              name="person-circle-outline"
              size={21}
              color={assignedTailor ? '#23844D' : '#98717E'}
            />

            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentLabel}>
                {assignedTailor
                  ? 'Assigned Tailor'
                  : 'No Tailor Assigned'}
              </Text>

              <Text style={styles.assignmentName}>
                {assignedTailor?.full_name ??
                  (item.assignment
                    ? 'Assigned tailor not found'
                    : 'Waiting for assignment')}
              </Text>
            </View>

            {assignedTailor ? (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#23844D"
              />
            ) : (
              <Ionicons
                name="time-outline"
                size={22}
                color="#D99A3D"
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.assignButton}
            onPress={() =>
              openAssignment({
                id: item.id,
                type: item.type,
                title: item.title,
                detail: item.detail,
              })
            }
          >
            <Ionicons
              name={
                item.assignment
                  ? 'create-outline'
                  : 'person-add-outline'
              }
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.assignButtonText}>
              {item.assignment
                ? 'Change Tailor'
                : 'Assign Tailor'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tailor Assignments</Text>

        <Text style={styles.subtitle}>
          Assign available tailors to eligible orders.
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {cards.length}
          </Text>
          <Text style={styles.summaryLabel}>
            Eligible Orders
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {assignedCount}
          </Text>
          <Text style={styles.summaryLabel}>
            Assigned
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {cards.length - assignedCount}
          </Text>
          <Text style={styles.summaryLabel}>
            Unassigned
          </Text>
        </View>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'catalog' &&
              styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType('catalog')}
        >
          <Ionicons
            name="bag-handle-outline"
            size={18}
            color={selectedType === 'catalog' ? '#FFFFFF' : PINK}
          />
          <Text
            style={[
              styles.typeButtonText,
              selectedType === 'catalog' &&
                styles.typeButtonTextActive,
            ]}
          >
            Catalog Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === 'custom' &&
              styles.typeButtonActive,
          ]}
          onPress={() => setSelectedType('custom')}
        >
          <Ionicons
            name="shirt-outline"
            size={18}
            color={selectedType === 'custom' ? '#FFFFFF' : PINK}
          />
          <Text
            style={[
              styles.typeButtonText,
              selectedType === 'custom' &&
                styles.typeButtonTextActive,
            ]}
          >
            Custom Orders
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {selectedType === 'catalog'
            ? 'Pending Catalog Orders'
            : 'Accepted Custom Orders'}
        </Text>

        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            void loadData(false);
          }}
          disabled={loading || refreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={PINK}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={styles.loadingText}>
            Loading orders and tailors...
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderOrder}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadData(false);
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="file-tray-outline"
                size={52}
                color="#DDC7D0"
              />
              <Text style={styles.emptyTitle}>
                No Eligible Orders
              </Text>
              <Text style={styles.emptyText}>
                {selectedType === 'catalog'
                  ? 'Pending catalog orders will appear here.'
                  : 'Custom orders appear here after customers accept their quotations.'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={selectedOrder !== null}
        transparent
        animationType="slide"
        onRequestClose={closeAssignment}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingInfo}>
                <Text style={styles.modalTitle}>
                  Assign a Tailor
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedOrder?.title}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeAssignment}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#555555"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.selectLabel}>
              Select an available tailor
            </Text>

            <ScrollView
              style={styles.tailorList}
              keyboardShouldPersistTaps="handled"
            >
              {availableTailors.map((tailor) => {
                const selected =
                  selectedTailorId === tailor.id;

                return (
                  <TouchableOpacity
                    key={tailor.id}
                    style={[
                      styles.tailorOption,
                      selected && styles.tailorOptionSelected,
                    ]}
                    onPress={() =>
                      setSelectedTailorId(tailor.id)
                    }
                    disabled={saving}
                  >
                    <View
                      style={[
                        styles.tailorAvatar,
                        selected && styles.tailorAvatarSelected,
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={23}
                        color={selected ? '#FFFFFF' : PINK}
                      />
                    </View>

                    <View style={styles.tailorDetails}>
                      <Text style={styles.tailorName}>
                        {tailor.full_name}
                      </Text>
                      <Text style={styles.tailorContact}>
                        {tailor.contact_number ||
                          'No contact number'}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        selected
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={23}
                      color={selected ? PINK : '#BBBBBB'}
                    />
                  </TouchableOpacity>
                );
              })}

              {availableTailors.length === 0 && (
                <View style={styles.noTailors}>
                  <Ionicons
                    name="people-outline"
                    size={40}
                    color="#D4B5C1"
                  />
                  <Text style={styles.emptyTitle}>
                    No Available Tailors
                  </Text>
                  <Text style={styles.emptyText}>
                    Add a tailor or enable an existing tailor in Manage Tailors.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (saving || availableTailors.length === 0) &&
                  styles.disabledButton,
              ]}
              onPress={saveAssignment}
              disabled={saving || availableTailors.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>
                    Save Assignment
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeAssignment}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  header: {
    marginBottom: 16,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#3F2630',
  },

  subtitle: {
    fontSize: 13,
    color: '#8C6674',
    marginTop: 5,
  },

  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 21,
    fontWeight: '800',
    color: '#B84470',
  },

  summaryLabel: {
    fontSize: 10,
    color: '#777777',
    marginTop: 4,
    textAlign: 'center',
  },

  typeSelector: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 17,
  },

  typeButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 7,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F0D9E2',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  typeButtonActive: {
    backgroundColor: PINK,
    borderColor: PINK,
  },

  typeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B84470',
  },

  typeButtonTextActive: {
    color: '#FFFFFF',
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  listTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#49323B',
  },

  list: {
    paddingBottom: 30,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E2E7',
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  orderIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  orderInfo: {
    flex: 1,
    minWidth: 0,
  },

  orderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3F2630',
  },

  orderDetail: {
    fontSize: 11,
    color: '#927582',
    marginTop: 3,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3DF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D99A3D',
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#98661D',
    textTransform: 'capitalize',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },

  infoText: {
    fontSize: 12,
    color: '#755C66',
  },

  assignmentBox: {
    marginTop: 6,
    padding: 11,
    backgroundColor: '#FFF8FA',
    borderWidth: 1,
    borderColor: '#F3E2E9',
    borderRadius: 10,
  },

  assignmentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  assignmentInfo: {
    flex: 1,
    marginHorizontal: 8,
  },

  assignmentLabel: {
    fontSize: 10,
    color: '#927582',
  },

  assignmentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#49323B',
    marginTop: 3,
  },

  assignButton: {
    backgroundColor: PINK,
    borderRadius: 9,
    paddingVertical: 11,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  assignButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 13,
    color: '#927582',
    marginTop: 10,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 45,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#49323B',
    marginTop: 12,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 12,
    color: '#927582',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 15, 22, 0.48)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  modalHeadingInfo: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3F2630',
  },

  modalSubtitle: {
    fontSize: 12,
    color: '#927582',
    marginTop: 5,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6F1F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#49323B',
    marginBottom: 10,
  },

  tailorList: {
    flexGrow: 0,
    flexShrink: 1,
  },

  tailorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
  },

  tailorOptionSelected: {
    borderColor: PINK,
    backgroundColor: '#FFF5F8',
  },

  tailorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  tailorAvatarSelected: {
    backgroundColor: PINK,
  },

  tailorDetails: {
    flex: 1,
  },

  tailorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#49323B',
  },

  tailorContact: {
    fontSize: 11,
    color: '#927582',
    marginTop: 4,
  },

  noTailors: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
  },

  saveButton: {
    backgroundColor: PINK,
    borderRadius: 11,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  disabledButton: {
    opacity: 0.55,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 13,
  },

  cancelButtonText: {
    color: '#777777',
    fontSize: 14,
    fontWeight: '700',
  },
});
