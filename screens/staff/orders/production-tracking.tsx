
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

type ProductionOrder = {
  id: string;
  orderType: OrderType;
  description: string;
  tailorId: string;
  tailorName: string;
  productionId: string | null;
  status: string;
};

type Stage = {
  value: string;
  label: string;
};

type Assignment = {
  id: string;
  tailor_id: string;
  order_id: string | null;
  custom_order_id: string | null;
};

type Tailor = {
  id: string;
  full_name: string;
};

type ProductionRecord = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  tailor_id: string;
  status: string;
};

type CatalogOrder = {
  id: string;
  status: string;
};

type CustomOrder = {
  id: string;
  status: string;
  garment_description: string | null;
};

const stages: Stage[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'sewing', label: 'Sewing' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'completed', label: 'Completed' },
];

export default function ProductionTrackingScreen() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] =
    useState<OrderType>('catalog');
  const [selectedOrder, setSelectedOrder] =
    useState<ProductionOrder | null>(null);

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        assignmentsResult,
        tailorsResult,
        productionResult,
      ] = await Promise.all([
        supabase
          .from('tailor_assignments')
          .select('id, tailor_id, order_id, custom_order_id'),

        supabase
          .from('tailors')
          .select('id, full_name'),

        supabase
          .from('production_tracking')
          .select('id, order_id, custom_order_id, tailor_id, status'),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (tailorsResult.error) throw tailorsResult.error;
      if (productionResult.error) throw productionResult.error;

      const assignments =
        (assignmentsResult.data || []) as Assignment[];

      const tailors =
        (tailorsResult.data || []) as Tailor[];

      const productionRecords =
        (productionResult.data || []) as ProductionRecord[];

      const catalogIds = assignments
        .map((item: Assignment) => item.order_id)
        .filter((id): id is string => !!id);

      const customIds = assignments
        .map((item: Assignment) => item.custom_order_id)
        .filter((id): id is string => !!id);

      const [catalogResult, customResult] = await Promise.all([
        catalogIds.length
          ? supabase
              .from('orders')
              .select('id, status')
              .in('id', catalogIds)
          : Promise.resolve({ data: [], error: null } as any),

        customIds.length
          ? supabase
              .from('custom_orders')
              .select('id, status, garment_description')
              .in('id', customIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (customResult.error) throw customResult.error;

      const catalogOrders =
        (catalogResult.data || []) as CatalogOrder[];

      const customOrders =
        (customResult.data || []) as CustomOrder[];

      const result: ProductionOrder[] = [];

      assignments.forEach((assignment: Assignment) => {
        const tailor = tailors.find(
          (item: Tailor) => item.id === assignment.tailor_id
        );

        const production = productionRecords.find(
          (item: ProductionRecord) =>
            item.order_id === assignment.order_id &&
            item.custom_order_id === assignment.custom_order_id
        );

        if (assignment.order_id) {
          const order = catalogOrders.find(
            (item: CatalogOrder) => item.id === assignment.order_id
          );

          if (!order) return;

          result.push({
            id: order.id,
            orderType: 'catalog',
            description: 'Catalog Order',
            tailorId: assignment.tailor_id,
            tailorName: tailor?.full_name || 'Unknown Tailor',
            productionId: production?.id || null,
            status: production?.status || 'assigned',
          });
        }

        if (assignment.custom_order_id) {
          const order = customOrders.find(
            (item: CustomOrder) =>
              item.id === assignment.custom_order_id
          );

          if (!order) return;

          result.push({
            id: order.id,
            orderType: 'custom',
            description:
              order.garment_description || 'Custom Order',
            tailorId: assignment.tailor_id,
            tailorName: tailor?.full_name || 'Unknown Tailor',
            productionId: production?.id || null,
            status: production?.status || 'assigned',
          });
        }
      });

      setOrders(result);
    } catch (error: any) {
      Alert.alert(
        'Loading Failed',
        error.message || 'Unable to load production orders.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [])
  );

  const updateStage = async (stage: string) => {
    if (!selectedOrder) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const values: any = {
        tailor_id: selectedOrder.tailorId,
        order_id:
          selectedOrder.orderType === 'catalog'
            ? selectedOrder.id
            : null,
        custom_order_id:
          selectedOrder.orderType === 'custom'
            ? selectedOrder.id
            : null,
        status: stage,
        updated_at: now,
      };

      if (stage === 'cutting' && !selectedOrder.productionId) {
        values.started_at = now;
      }

      if (stage === 'completed') {
        values.completed_at = now;
      } else {
        values.completed_at = null;
      }

      let error;

      if (selectedOrder.productionId) {
        const result = await supabase
          .from('production_tracking')
          .update(values)
          .eq('id', selectedOrder.productionId);

        error = result.error;
      } else {
        const result = await supabase
          .from('production_tracking')
          .insert(values);

        error = result.error;
      }

      if (error) throw error;

      setSelectedOrder(null);
      await loadData();

      Alert.alert('Success', 'Production stage updated successfully.');
    } catch (error: any) {
      Alert.alert(
        'Update Failed',
        error.message || 'Unable to update production stage.'
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredOrders = orders.filter(
    (item: ProductionOrder) => item.orderType === selectedType
  );

  const getStageLabel = (value: string) =>
    stages.find((item: Stage) => item.value === value)?.label || value;

  const renderOrder = ({ item }: { item: ProductionOrder }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderType}>
            {item.orderType === 'catalog'
              ? 'CATALOG ORDER'
              : 'CUSTOM ORDER'}
          </Text>

          <Text style={styles.orderTitle}>
            {item.description}
          </Text>

          <Text style={styles.orderId}>
            Order ID: {item.id.slice(0, 8)}
          </Text>
        </View>

        <Ionicons
          name="shirt-outline"
          size={28}
          color="#D96B8A"
        />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={17} color="#98717E" />
        <Text style={styles.infoText}>
          Tailor: {item.tailorName}
        </Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Production Stage</Text>
        <Text style={styles.statusValue}>
          {getStageLabel(item.status)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => setSelectedOrder(item)}
      >
        <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
        <Text style={styles.updateButtonText}>
          Update Production Stage
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === 'catalog' && styles.activeTab,
          ]}
          onPress={() => setSelectedType('catalog')}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === 'catalog' && styles.activeTabText,
            ]}
          >
            Catalog Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedType === 'custom' && styles.activeTab,
          ]}
          onPress={() => setSelectedType('custom')}
        >
          <Text
            style={[
              styles.tabText,
              selectedType === 'custom' && styles.activeTabText,
            ]}
          >
            Custom Orders
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#D96B8A"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item: ProductionOrder) =>
            `${item.orderType}-${item.id}`
          }
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="clipboard-outline"
                size={45}
                color="#D9A6B7"
              />
              <Text style={styles.emptyTitle}>
                No Assigned Orders
              </Text>
              <Text style={styles.emptyText}>
                Orders assigned to tailors will appear here.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Update Production
              </Text>

              <TouchableOpacity
                onPress={() => setSelectedOrder(null)}
              >
                <Ionicons name="close" size={25} color="#65424F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select the current production stage.
            </Text>

            <ScrollView>
              {stages.map((stage: Stage, index: number) => (
                <TouchableOpacity
                  key={stage.value}
                  disabled={saving}
                  style={[
                    styles.stageButton,
                    selectedOrder?.status === stage.value &&
                      styles.selectedStage,
                  ]}
                  onPress={() => updateStage(stage.value)}
                >
                  <View style={styles.stageNumber}>
                    <Text style={styles.stageNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.stageText,
                      selectedOrder?.status === stage.value &&
                        styles.selectedStageText,
                    ]}
                  >
                    {stage.label}
                  </Text>

                  {selectedOrder?.status === stage.value && (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color="#D96B8A"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {saving && (
              <ActivityIndicator
                color="#D96B8A"
                style={{ marginTop: 12 }}
              />
            )}
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
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0D9E2',
    backgroundColor: '#FFFFFF',
  },
  activeTab: {
    backgroundColor: '#D96B8A',
    borderColor: '#D96B8A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B84470',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3E2E8',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderType: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D96B8A',
    letterSpacing: 0.7,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3F2630',
    marginTop: 4,
  },
  orderId: {
    fontSize: 10,
    color: '#98717E',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 7,
  },
  infoText: {
    color: '#65424F',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#FFF4F7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 10,
    color: '#98717E',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    color: '#B84470',
    fontWeight: '800',
    marginTop: 4,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D96B8A',
    borderRadius: 10,
    padding: 12,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    marginTop: 65,
    paddingHorizontal: 25,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#65424F',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#98717E',
    textAlign: 'center',
    marginTop: 6,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000070',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3F2630',
  },
  modalSubtitle: {
    color: '#98717E',
    fontSize: 12,
    marginTop: 7,
    marginBottom: 14,
  },
  stageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0D9E2',
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  selectedStage: {
    backgroundColor: '#FFF1F5',
    borderColor: '#D96B8A',
  },
  stageNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#F8E3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumberText: {
    color: '#B84470',
    fontSize: 11,
    fontWeight: '800',
  },
  stageText: {
    flex: 1,
    color: '#65424F',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedStageText: {
    color: '#B84470',
  },
});
