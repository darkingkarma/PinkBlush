
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigator';

import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ConfigureParts'
>;

type GarmentPart = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  gender: string;
  available: boolean;
};

type SelectedDesign = {
  id: string;
  name: string;
  image_url: string | null;
  description?: string | null;
};

type Design = SelectedDesign & {
  description: string | null;
};

type SelectedFabric = {
  id: string;
  name: string;
  price_addition: number;
  image_url?: string | null;
  description?: string | null;
};

type Fabric = SelectedFabric & {
  description: string | null;
  image_url: string | null;
  price_addition: number;
  available: boolean;
};

type ModalType = 'design' | 'fabric' | null;

export default function ConfigurePartsScreen({
  route,
  navigation,
}: Props) {
  const {
    garment,
    selectedPartIds,
    selectedDesigns: initialSelectedDesigns,
    selectedFabrics: initialSelectedFabrics,
  } = route.params;

  const [parts, setParts] = useState<GarmentPart[]>([]);

  const [selectedDesigns, setSelectedDesigns] =
    useState<Record<string, SelectedDesign>>(
      initialSelectedDesigns || {}
    );

  const [selectedFabrics, setSelectedFabrics] =
    useState<Record<string, SelectedFabric>>(
      initialSelectedFabrics || {}
    );

  const [quantities, setQuantities] =
    useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [activePart, setActivePart] =
    useState<GarmentPart | null>(null);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Temporary selections are applied only when confirmed.
  const [pendingDesign, setPendingDesign] =
    useState<SelectedDesign | null>(null);

  const [pendingFabric, setPendingFabric] =
    useState<SelectedFabric | null>(null);

  const getParts = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('garment_parts')
        .select('id, name, description, price, gender, available')
        .in('id', selectedPartIds)
        .order('name');

      if (error) throw error;

      setParts((data || []) as GarmentPart[]);
    } catch (error) {
      console.log('Error loading garment parts:', error);
      Alert.alert('Error', 'Could not load garment parts.');
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getParts();
    }, [selectedPartIds])
  );

  const closeModal = () => {
    setModalType(null);
    setActivePart(null);
    setPendingDesign(null);
    setPendingFabric(null);
  };

  // Open design modal and load designs for this part.
  const openDesignModal = async (part: GarmentPart) => {
    setActivePart(part);
    setModalType('design');
    setLoadingOptions(true);
    setDesigns([]);

    setPendingDesign(selectedDesigns[part.id] || null);

    try {
      const { data, error } = await supabase
        .from('designs')
        .select('id, name, description, image_url')
        .eq('garment_part_id', part.id)
        .order('name');

      if (error) throw error;

      setDesigns((data || []) as Design[]);
    } catch (error) {
      console.log('Error loading designs:', error);
      Alert.alert('Error', 'Could not load designs for this part.');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Open fabric modal using your existing relationship table.
  const openFabricModal = async (part: GarmentPart) => {
    setActivePart(part);
    setModalType('fabric');
    setLoadingOptions(true);
    setFabrics([]);

    setPendingFabric(selectedFabrics[part.id] || null);

    try {
      const { data, error } = await supabase
        .from('garment_fabrics')
        .select(`
          fabric_id,
          fabrics (
            id,
            name,
            description,
            image_url,
            price_addition,
            available
          )
        `)
        .eq('garment_part_id', part.id);

      if (error) throw error;

      const fabricList = (data || [])
        .map((item: any) => {
          // Supabase relationships may return an object or an array.
          const related = Array.isArray(item.fabrics)
            ? item.fabrics[0]
            : item.fabrics;

          return related;
        })
        .filter(
          (fabric: Fabric | null | undefined) =>
            fabric && fabric.available
        ) as Fabric[];

      setFabrics(fabricList);
    } catch (error) {
      console.log('Error loading fabrics:', error);
      Alert.alert('Error', 'Could not load fabrics for this part.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const confirmSelection = () => {
    if (!activePart || !modalType) return;

    if (modalType === 'design') {
      if (!pendingDesign) {
        Alert.alert('Choose a design', 'Please select a design first.');
        return;
      }

      setSelectedDesigns((current) => ({
        ...current,
        [activePart.id]: pendingDesign,
      }));
    }

    if (modalType === 'fabric') {
      if (!pendingFabric) {
        Alert.alert('Choose a fabric', 'Please select a fabric first.');
        return;
      }

      setSelectedFabrics((current) => ({
        ...current,
        [activePart.id]: pendingFabric,
      }));
    }

    closeModal();
  };

  const increaseQuantity = (partId: string) => {
    setQuantities((current) => ({
      ...current,
      [partId]: (current[partId] || 1) + 1,
    }));
  };

  const decreaseQuantity = (partId: string) => {
    setQuantities((current) => {
      const quantity = current[partId] || 1;

      if (quantity <= 1) return current;

      return {
        ...current,
        [partId]: quantity - 1,
      };
    });
  };

  const getUnitPrice = (part: GarmentPart) => {
    const fabricAddition =
      selectedFabrics[part.id]?.price_addition || 0;

    return Number(part.price) + Number(fabricAddition);
  };

  const getSubtotal = (part: GarmentPart) => {
    return getUnitPrice(part) * (quantities[part.id] || 1);
  };

  const totalAmount = parts.reduce(
    (total, part) => total + getSubtotal(part),
    0
  );

  const continueToMeasurements = () => {
    if (parts.length === 0) {
      Alert.alert('No parts', 'Please select at least one garment part.');
      return;
    }

    const items = parts.map((part) => ({
      partId: part.id,
      partName: part.name,

      designId: selectedDesigns[part.id]?.id || null,
      designName: selectedDesigns[part.id]?.name || null,
      designImage: selectedDesigns[part.id]?.image_url || null,

      fabricId: selectedFabrics[part.id]?.id || null,
      fabricName: selectedFabrics[part.id]?.name || null,

      quantity: quantities[part.id] || 1,
      unitPrice: getUnitPrice(part),
      subtotal: getSubtotal(part),
    }));

    navigation.navigate('OrderMeasurements', {
      orderData: {
        garment,
        items,
        totalAmount,
      },
    });
  };

  const renderOptionImage = (imageUrl: string | null | undefined) => {
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={styles.optionImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={[styles.optionImage, styles.imagePlaceholder]}>
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configure Parts</Text>
        <Text style={styles.subtitle}>{garment.name}</Text>
        <Text style={styles.helperText}>
          Choose a design and fabric for each selected part.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#d96b8a" />
          <Text style={styles.emptyText}>Loading selected parts...</Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No garment parts were found.
              </Text>
            </View>
          }
          ListFooterComponent={
            <View>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  ₱{totalAmount.toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={continueToMeasurements}
              >
                <Text style={styles.continueButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const design = selectedDesigns[item.id];
            const fabric = selectedFabrics[item.id];

            return (
              <View style={styles.card}>
                <Text style={styles.partName}>{item.name}</Text>
                <Text style={styles.gender}>{item.gender}</Text>

                <Text style={styles.price}>
                  Base price: ₱{Number(item.price).toFixed(2)}
                </Text>

                {!!item.description && (
                  <Text style={styles.description}>
                    {item.description}
                  </Text>
                )}

                {/* DESIGN BUTTON */}
                <TouchableOpacity
                  style={styles.selectionBox}
                  onPress={() => openDesignModal(item)}
                >
                  {renderOptionImage(design?.image_url)}

                  <View style={styles.selectionInfo}>
                    <Text style={styles.optionTitle}>Design</Text>
                    <Text
                      style={[
                        styles.optionText,
                        design && styles.selectedOptionText,
                      ]}
                    >
                      {design?.name || 'Choose Design'}
                    </Text>
                  </View>

                  <Text style={styles.changeText}>
                    {design ? 'Change' : 'Select'}
                  </Text>
                </TouchableOpacity>

                {/* FABRIC BUTTON */}
                <TouchableOpacity
                  style={styles.selectionBox}
                  onPress={() => openFabricModal(item)}
                >
                  {renderOptionImage(fabric?.image_url)}

                  <View style={styles.selectionInfo}>
                    <Text style={styles.optionTitle}>Fabric</Text>
                    <Text
                      style={[
                        styles.optionText,
                        fabric && styles.selectedOptionText,
                      ]}
                    >
                      {fabric?.name || 'Choose Fabric'}
                    </Text>
                    {fabric && (
                      <Text style={styles.additionText}>
                        +₱{Number(fabric.price_addition).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.changeText}>
                    {fabric ? 'Change' : 'Select'}
                  </Text>
                </TouchableOpacity>

                {/* QUANTITY */}
                <View style={styles.quantityBox}>
                  <Text style={styles.optionTitle}>Quantity</Text>

                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => decreaseQuantity(item.id)}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>
                      {quantities[item.id] || 1}
                    </Text>

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => increaseQuantity(item.id)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* SUBTOTAL */}
                <View style={styles.subtotalBox}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalAmount}>
                    ₱{getSubtotal(item).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* DESIGN AND FABRIC MODAL */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>
                  {modalType === 'design'
                    ? 'Choose a Design'
                    : 'Choose a Fabric'}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {activePart?.name || 'Garment part'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingOptions ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#d96b8a" />
                <Text style={styles.emptyText}>
                  Loading {modalType === 'design' ? 'designs' : 'fabrics'}...
                </Text>
              </View>
            ) : modalType === 'design' ? (
              <FlatList
                data={designs}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                ListEmptyComponent={
                  <View style={styles.emptyOptions}>
                    <Text style={styles.emptyTitle}>
                      No designs available
                    </Text>
                    <Text style={styles.emptyText}>
                      No designs have been added for this part yet.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = pendingDesign?.id === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => setPendingDesign(item)}
                    >
                      {renderOptionImage(item.image_url)}

                      <View style={styles.optionCardInfo}>
                        <Text style={styles.optionCardTitle}>
                          {item.name}
                        </Text>
                        <Text style={styles.optionDescription}>
                          {item.description || 'No description available.'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={fabrics}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                ListEmptyComponent={
                  <View style={styles.emptyOptions}>
                    <Text style={styles.emptyTitle}>
                      No fabrics available
                    </Text>
                    <Text style={styles.emptyText}>
                      No available fabrics are assigned to this part.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = pendingFabric?.id === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => setPendingFabric(item)}
                    >
                      {renderOptionImage(item.image_url)}

                      <View style={styles.optionCardInfo}>
                        <Text style={styles.optionCardTitle}>
                          {item.name}
                        </Text>
                        <Text style={styles.optionDescription}>
                          {item.description || 'No description available.'}
                        </Text>
                        <Text style={styles.additionText}>
                          +₱{Number(item.price_addition).toFixed(2)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (
                    loadingOptions ||
                    (modalType === 'design' && !pendingDesign) ||
                    (modalType === 'fabric' && !pendingFabric)
                  ) && styles.confirmButtonDisabled,
                ]}
                disabled={
                  loadingOptions ||
                  (modalType === 'design' && !pendingDesign) ||
                  (modalType === 'fabric' && !pendingFabric)
                }
                onPress={confirmSelection}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm Selection
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    padding: 20,
    paddingBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 5,
  },

  helperText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },

  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    flexGrow: 1,
  },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },

  partName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  gender: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 6,
  },

  description: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 6,
  },

  selectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 12,
  },

  optionImage: {
    width: 66,
    height: 66,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },

  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
  },

  selectionInfo: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  optionText: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },

  selectedOptionText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d96b8a',
  },

  additionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 5,
  },

  quantityBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  quantityButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityButtonText: {
    fontSize: 22,
    color: '#d96b8a',
    fontWeight: '600',
  },

  quantityText: {
    width: 50,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  subtotalBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  subtotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  subtotalAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#d96b8a',
  },

  totalBox: {
    marginTop: 5,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fdf1f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d96b8a',
  },

  continueButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    alignItems: 'center',
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    height: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalHeading: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#d96b8a',
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  closeButtonText: {
    fontSize: 16,
    color: '#555',
  },

  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalList: {
    paddingBottom: 12,
    flexGrow: 1,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },

  optionCardSelected: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff7fa',
  },

  optionCardInfo: {
    flex: 1,
  },

  optionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },

  optionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#888',
    marginTop: 4,
  },

  radioCircle: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioCircleSelected: {
    borderColor: '#d96b8a',
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d96b8a',
  },

  emptyOptions: {
    padding: 25,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },

  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },

  confirmButton: {
    flex: 1.6,
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmButtonDisabled: {
    opacity: 0.45,
  },

  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
