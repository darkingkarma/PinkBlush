
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
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigator';
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

type DesignFabricRow = {
  fabrics: Fabric | Fabric[] | null;
};

type ModalType = 'design' | 'fabric' | null;

const MAX_QUANTITY = 99;
const CONTENT_MAX_WIDTH = 850;
const MODAL_MAX_WIDTH = 680;

// Reusable image component with broken-image fallback.
function OptionImage({
  imageUrl,
  large = false,
}: {
  imageUrl?: string | null;
  large?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageStyle = large
    ? styles.largeOptionImage
    : styles.optionImage;

  if (!imageUrl || imageFailed) {
    return (
      <View style={[imageStyle, styles.imagePlaceholder]}>
        <Ionicons
          name="image-outline"
          size={large ? 30 : 23}
          color="#d96b8a"
        />

        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }

  return (
    <View style={[imageStyle, styles.optionImageContainer]}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.imageContent}
        resizeMode="contain"
        onError={() => setImageFailed(true)}
      />
    </View>
  );
}

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

  const { width: screenWidth } = useWindowDimensions();

  const isTablet = screenWidth >= 700;
  const cardPadding = screenWidth < 360 ? 12 : 16;

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
  const [loadError, setLoadError] = useState('');

  const [modalType, setModalType] = useState<ModalType>(null);

  const [activePart, setActivePart] =
    useState<GarmentPart | null>(null);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState('');

  const [pendingDesign, setPendingDesign] =
    useState<SelectedDesign | null>(null);

  const [pendingFabric, setPendingFabric] =
    useState<SelectedFabric | null>(null);

  // Load selected garment parts.
  const getParts = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      if (!selectedPartIds || selectedPartIds.length === 0) {
        setParts([]);
        return;
      }

      const { data, error } = await supabase
        .from('garment_parts')
        .select('id, name, description, price, gender, available')
        .in('id', selectedPartIds)
        .eq('available', true)
        .order('name');

      if (error) throw error;

      const availableParts = (data || []) as GarmentPart[];

      setParts(availableParts);

      const availableIds = new Set(
        availableParts.map((part) => part.id)
      );

      // Keep only selections belonging to available parts.
      setSelectedDesigns((current) => {
        const updated: Record<string, SelectedDesign> = {};

        Object.entries(current).forEach(([id, design]) => {
          if (availableIds.has(id)) {
            updated[id] = design;
          }
        });

        return updated;
      });

      setSelectedFabrics((current) => {
        const updated: Record<string, SelectedFabric> = {};

        Object.entries(current).forEach(([id, fabric]) => {
          if (availableIds.has(id)) {
            updated[id] = fabric;
          }
        });

        return updated;
      });
    } catch (error) {
      console.error('Error loading garment parts:', error);

      setParts([]);
      setLoadError(
        'Could not load garment parts. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPartIds]);

  useFocusEffect(
    useCallback(() => {
      void getParts();
    }, [getParts])
  );

  // Close modal and clear temporary selections.
  const closeModal = () => {
    setModalType(null);
    setActivePart(null);
    setPendingDesign(null);
    setPendingFabric(null);
    setOptionsError('');
    setDesigns([]);
    setFabrics([]);
  };

  // Open design selection.
  const openDesignModal = async (part: GarmentPart) => {
    setActivePart(part);
    setModalType('design');
    setLoadingOptions(true);
    setOptionsError('');

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
      console.error('Error loading designs:', error);

      setOptionsError(
        'Could not load designs. Please try again.'
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  // Open fabric selection for the currently selected design.
  const openFabricModal = async (part: GarmentPart) => {
    const selectedDesign = selectedDesigns[part.id];

    if (!selectedDesign) {
      Alert.alert(
        'Choose a Design First',
        'Please select a design before choosing its fabric.'
      );
      return;
    }

    setActivePart(part);
    setModalType('fabric');
    setLoadingOptions(true);
    setOptionsError('');

    setFabrics([]);
    setPendingFabric(selectedFabrics[part.id] || null);

    try {
      const { data, error } = await supabase
        .from('design_fabrics')
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
        .eq('design_id', selectedDesign.id);

      if (error) throw error;

      const rows = (data || []) as unknown as DesignFabricRow[];

      const fabricList = rows
        .map((item) => {
          const related = Array.isArray(item.fabrics)
            ? item.fabrics[0]
            : item.fabrics;

          return related;
        })
        .filter(
          (fabric): fabric is Fabric =>
            !!fabric && fabric.available === true
        );

      setFabrics(fabricList);

      // Check whether the previously selected fabric
      // is still assigned to this design.
      const currentFabric = selectedFabrics[part.id];

      if (
        currentFabric &&
        !fabricList.some(
          (fabric) => fabric.id === currentFabric.id
        )
      ) {
        setPendingFabric(null);

        setSelectedFabrics((current) => {
          const updated = { ...current };
          delete updated[part.id];
          return updated;
        });
      }
    } catch (error) {
      console.error('Error loading design fabrics:', error);

      setOptionsError(
        'Could not load fabrics assigned to this design. Please try again.'
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  // Confirm design or fabric selection.
  const confirmSelection = () => {
    if (!activePart || !modalType) return;

    if (modalType === 'design') {
      if (!pendingDesign) {
        Alert.alert(
          'Choose a Design',
          'Please select a design first.'
        );
        return;
      }

      // Make sure the selected design is still in the loaded options.
      const validDesign = designs.find(
        (design) => design.id === pendingDesign.id
      );

      if (!validDesign) {
        Alert.alert(
          'Design Unavailable',
          'Please select an available design.'
        );
        return;
      }

      const previousDesign = selectedDesigns[activePart.id];

      setSelectedDesigns((current) => ({
        ...current,
        [activePart.id]: validDesign,
      }));

      // A changed design may have different available fabrics.
      if (
        previousDesign &&
        previousDesign.id !== validDesign.id
      ) {
        setSelectedFabrics((current) => {
          const updated = { ...current };
          delete updated[activePart.id];
          return updated;
        });
      }
    }

    if (modalType === 'fabric') {
      if (!pendingFabric) {
        Alert.alert(
          'Choose a Fabric',
          'Please select a fabric first.'
        );
        return;
      }

      // Make sure the selected fabric is in the current design's options.
      const validFabric = fabrics.find(
        (fabric) => fabric.id === pendingFabric.id
      );

      if (!validFabric) {
        Alert.alert(
          'Fabric Unavailable',
          'Please select an available fabric for this design.'
        );
        return;
      }

      setSelectedFabrics((current) => ({
        ...current,
        [activePart.id]: validFabric,
      }));
    }

    closeModal();
  };

  // Quantity controls.
  const increaseQuantity = (partId: string) => {
    setQuantities((current) => {
      const quantity = current[partId] || 1;

      if (quantity >= MAX_QUANTITY) {
        return current;
      }

      return {
        ...current,
        [partId]: quantity + 1,
      };
    });
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

  // Price calculations.
  const getUnitPrice = (part: GarmentPart) => {
    const fabricAddition =
      selectedFabrics[part.id]?.price_addition || 0;

    return (
      Number(part.price || 0) +
      Number(fabricAddition || 0)
    );
  };

  const getSubtotal = (part: GarmentPart) => {
    return getUnitPrice(part) * (quantities[part.id] || 1);
  };

  const totalAmount = parts.reduce(
    (total, part) => total + getSubtotal(part),
    0
  );

  // Check whether all parts are configured.
  const incompletePart = parts.find(
    (part) =>
      !selectedDesigns[part.id] ||
      !selectedFabrics[part.id]
  );

  const allPartsConfigured =
    parts.length > 0 && !incompletePart;

  // Continue to measurements.
  const continueToMeasurements = () => {
    if (parts.length === 0) {
      Alert.alert(
        'No Parts',
        'Please select at least one available garment part.'
      );
      return;
    }

    const missingPart = parts.find(
      (part) =>
        !selectedDesigns[part.id] ||
        !selectedFabrics[part.id]
    );

    if (missingPart) {
      Alert.alert(
        'Incomplete Selection',
        `Please choose both a design and a fabric for ${missingPart.name}.`
      );
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

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View style={styles.contentWidth}>
          <Text style={styles.title}>Configure Parts</Text>

          <Text style={styles.subtitle}>
            {garment.name}
          </Text>

          <Text style={styles.helperText}>
            Choose a design first, then select a fabric available for that design.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#d96b8a"
          />

          <Text style={styles.emptyText}>
            Loading selected parts...
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color="#d96b8a"
          />

          <Text style={styles.emptyTitle}>
            Unable to Load Parts
          </Text>

          <Text style={styles.emptyText}>
            {loadError}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void getParts()}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="shirt-outline"
                size={45}
                color="#d96b8a"
              />

              <Text style={styles.emptyTitle}>
                No Available Parts
              </Text>

              <Text style={styles.emptyText}>
                The selected garment parts are no longer available.
                Please return and choose another part.
              </Text>
            </View>
          }
          ListFooterComponent={
            parts.length > 0 ? (
              <View>
                {/* Total */}
                <View style={styles.totalBox}>
                  <View style={styles.totalInfo}>
                    <Text style={styles.totalLabel}>
                      Order Subtotal
                    </Text>

                    <Text style={styles.totalHint}>
                      Based on selected parts and fabrics
                    </Text>
                  </View>

                  <Text style={styles.totalAmount}>
                    ₱{totalAmount.toFixed(2)}
                  </Text>
                </View>

                {/* Configuration Progress */}
                {!allPartsConfigured && (
                  <View style={styles.progressNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color="#b77b36"
                    />

                    <Text style={styles.progressText}>
                      Complete the design and fabric selections for every part to continue.
                    </Text>
                  </View>
                )}

                {/* Continue */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !allPartsConfigured &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={continueToMeasurements}
                  disabled={!allPartsConfigured}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    Continue to Measurements
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const design = selectedDesigns[item.id];
            const fabric = selectedFabrics[item.id];
            const quantity = quantities[item.id] || 1;

            return (
              <View
                style={[
                  styles.card,
                  { padding: cardPadding },
                ]}
              >
                {/* Part Information */}
                <View style={styles.partHeader}>
                  <View style={styles.partHeading}>
                    <Text style={styles.partName}>
                      {item.name}
                    </Text>

                    <Text style={styles.gender}>
                      {item.gender || 'Unspecified'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.partStatus,
                      design && fabric
                        ? styles.completeStatus
                        : styles.pendingStatus,
                    ]}
                  >
                    <Text
                      style={[
                        styles.partStatusText,
                        design && fabric
                          ? styles.completeStatusText
                          : styles.pendingStatusText,
                      ]}
                    >
                      {design && fabric ? 'Complete' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.price}>
                  Base price: ₱
                  {Number(item.price || 0).toFixed(2)}
                </Text>

                {!!item.description && (
                  <Text style={styles.description}>
                    {item.description}
                  </Text>
                )}

                {/* Design Selection */}
                <TouchableOpacity
                  style={styles.selectionBox}
                  onPress={() => void openDesignModal(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose design for ${item.name}`}
                >
                  <OptionImage imageUrl={design?.image_url} />

                  <View style={styles.selectionInfo}>
                    <Text style={styles.optionTitle}>
                      Design
                    </Text>

                    <Text
                      style={[
                        styles.optionText,
                        design && styles.selectedOptionText,
                      ]}
                      numberOfLines={2}
                    >
                      {design?.name || 'Choose Design'}
                    </Text>
                  </View>

                  <View style={styles.selectAction}>
                    <Text style={styles.changeText}>
                      {design ? 'Change' : 'Select'}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#d96b8a"
                    />
                  </View>
                </TouchableOpacity>

                {/* Fabric Selection */}
                <TouchableOpacity
                  style={[
                    styles.selectionBox,
                    !design && styles.disabledSelectionBox,
                  ]}
                  onPress={() => void openFabricModal(item)}
                  disabled={!design}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose fabric for ${item.name}`}
                  accessibilityState={{ disabled: !design }}
                >
                  <OptionImage imageUrl={fabric?.image_url} />

                  <View style={styles.selectionInfo}>
                    <Text style={styles.optionTitle}>
                      Fabric
                    </Text>

                    <Text
                      style={[
                        styles.optionText,
                        fabric && styles.selectedOptionText,
                      ]}
                      numberOfLines={2}
                    >
                      {!design
                        ? 'Choose a design first'
                        : fabric?.name || 'Choose Fabric'}
                    </Text>

                    {fabric && (
                      <Text style={styles.additionText}>
                        +₱
                        {Number(
                          fabric.price_addition || 0
                        ).toFixed(2)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.selectAction}>
                    <Text style={styles.changeText}>
                      {fabric ? 'Change' : 'Select'}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#d96b8a"
                    />
                  </View>
                </TouchableOpacity>

                {/* Quantity */}
                <View style={styles.quantityBox}>
                  <View style={styles.quantityInfo}>
                    <Text style={styles.optionTitle}>
                      Quantity
                    </Text>

                    <Text style={styles.quantityHint}>
                      Number of pieces (max. {MAX_QUANTITY})
                    </Text>
                  </View>

                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        quantity <= 1 &&
                          styles.quantityButtonDisabled,
                      ]}
                      onPress={() => decreaseQuantity(item.id)}
                      disabled={quantity <= 1}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease quantity for ${item.name}`}
                    >
                      <Ionicons
                        name="remove"
                        size={20}
                        color={quantity <= 1 ? '#bbb' : '#d96b8a'}
                      />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>
                      {quantity}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        quantity >= MAX_QUANTITY &&
                          styles.quantityButtonDisabled,
                      ]}
                      onPress={() => increaseQuantity(item.id)}
                      disabled={quantity >= MAX_QUANTITY}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase quantity for ${item.name}`}
                    >
                      <Ionicons
                        name="add"
                        size={20}
                        color={
                          quantity >= MAX_QUANTITY
                            ? '#bbb'
                            : '#d96b8a'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subtotal */}
                <View style={styles.subtotalBox}>
                  <Text style={styles.subtotalLabel}>
                    Subtotal
                  </Text>

                  <Text style={styles.subtotalAmount}>
                    ₱{getSubtotal(item).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Design / Fabric Modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              isTablet && styles.modalSheetTablet,
            ]}
          >
            <View style={styles.modalHandle} />

            {/* Modal Header */}
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
                accessibilityRole="button"
                accessibilityLabel="Close selection"
              >
                <Ionicons
                  name="close"
                  size={21}
                  color="#555"
                />
              </TouchableOpacity>
            </View>

            {/* Loading */}
            {loadingOptions ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator
                  size="large"
                  color="#d96b8a"
                />

                <Text style={styles.emptyText}>
                  Loading {modalType === 'design'
                    ? 'designs'
                    : 'fabrics'}...
                </Text>
              </View>
            ) : optionsError ? (
              <View style={styles.modalLoading}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={42}
                  color="#d96b8a"
                />

                <Text style={styles.emptyText}>
                  {optionsError}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    if (!activePart) return;

                    if (modalType === 'design') {
                      void openDesignModal(activePart);
                    } else {
                      void openFabricModal(activePart);
                    }
                  }}
                >
                  <Text style={styles.retryButtonText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : modalType === 'design' ? (
              <FlatList
                data={designs}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyOptions}>
                    <Ionicons
                      name="color-palette-outline"
                      size={40}
                      color="#d96b8a"
                    />

                    <Text style={styles.emptyTitle}>
                      No Designs Available
                    </Text>

                    <Text style={styles.emptyText}>
                      No designs have been added for this part yet.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected =
                    pendingDesign?.id === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => setPendingDesign(item)}
                      activeOpacity={0.8}
                    >
                      <OptionImage
                        imageUrl={item.image_url}
                        large
                      />

                      <View style={styles.optionCardInfo}>
                        <Text style={styles.optionCardTitle}>
                          {item.name}
                        </Text>

                        <Text style={styles.optionDescription}>
                          {item.description ||
                            'No description available.'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
                          isSelected &&
                            styles.radioCircleSelected,
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
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyOptions}>
                    <Ionicons
                      name="layers-outline"
                      size={40}
                      color="#d96b8a"
                    />

                    <Text style={styles.emptyTitle}>
                      No Fabrics Available
                    </Text>

                    <Text style={styles.emptyText}>
                      No available fabrics are assigned to this design.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected =
                    pendingFabric?.id === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => setPendingFabric(item)}
                      activeOpacity={0.8}
                    >
                      <OptionImage
                        imageUrl={item.image_url}
                        large
                      />

                      <View style={styles.optionCardInfo}>
                        <Text style={styles.optionCardTitle}>
                          {item.name}
                        </Text>

                        <Text style={styles.optionDescription}>
                          {item.description ||
                            'No description available.'}
                        </Text>

                        <Text style={styles.additionText}>
                          +₱
                          {Number(
                            item.price_addition || 0
                          ).toFixed(2)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.radioCircle,
                          isSelected &&
                            styles.radioCircleSelected,
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

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (
                    loadingOptions ||
                    !!optionsError ||
                    (modalType === 'design' &&
                      (!pendingDesign ||
                        !designs.some(
                          (design) => design.id === pendingDesign.id
                        ))) ||
                    (modalType === 'fabric' &&
                      (!pendingFabric ||
                        !fabrics.some(
                          (fabric) => fabric.id === pendingFabric.id
                        )))
                  ) && styles.confirmButtonDisabled,
                ]}
                disabled={
                  loadingOptions ||
                  !!optionsError ||
                  (modalType === 'design' &&
                    (!pendingDesign ||
                      !designs.some(
                        (design) => design.id === pendingDesign.id
                      ))) ||
                  (modalType === 'fabric' &&
                    (!pendingFabric ||
                      !fabrics.some(
                        (fabric) => fabric.id === pendingFabric.id
                      )))
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
    backgroundColor: '#FFF8FA',
  },

  contentWidth: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },

  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d96b8a',
    marginTop: 5,
  },

  helperText: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    lineHeight: 19,
  },

  list: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    flexGrow: 1,
  },

  card: {
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },

  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  partHeading: {
    flex: 1,
    minWidth: 0,
  },

  partName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },

  gender: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  partStatus: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  completeStatus: {
    backgroundColor: '#e7f6ed',
  },

  pendingStatus: {
    backgroundColor: '#fff1df',
  },

  partStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  completeStatusText: {
    color: '#318653',
  },

  pendingStatusText: {
    color: '#b77b36',
  },

  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#d96b8a',
    marginTop: 8,
  },

  description: {
    fontSize: 13,
    color: '#777',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 5,
  },

  selectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 12,
    padding: 10,
    marginTop: 11,
    gap: 10,
    backgroundColor: '#fff',
    minHeight: 86,
  },

  disabledSelectionBox: {
    opacity: 0.5,
    backgroundColor: '#f8f8f8',
  },

  optionImageContainer: {
    backgroundColor: '#fff5f8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },

  optionImage: {
    width: 62,
    height: 62,
    borderRadius: 9,
    overflow: 'hidden',
  },

  largeOptionImage: {
    width: 76,
    height: 76,
    borderRadius: 9,
    overflow: 'hidden',
  },

  imageContent: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    backgroundColor: '#FBEAF0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },

  placeholderText: {
    color: '#b77b91',
    fontSize: 9,
    textAlign: 'center',
  },

  selectionInfo: {
    flex: 1,
    minWidth: 0,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  optionText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  selectedOptionText: {
    color: '#d96b8a',
    fontWeight: '700',
  },

  selectAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d96b8a',
  },

  additionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d96b8a',
    marginTop: 5,
  },

  quantityBox: {
    borderWidth: 1,
    borderColor: '#F0E5E9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  quantityInfo: {
    flex: 1,
    minWidth: 0,
  },

  quantityHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  quantityButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityButtonDisabled: {
    borderColor: '#ddd',
    backgroundColor: '#f7f7f7',
  },

  quantityText: {
    minWidth: 25,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },

  subtotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#d96b8a',
  },

  totalBox: {
    marginTop: 5,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FCEEF3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  totalInfo: {
    flex: 1,
    minWidth: 0,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
  },

  totalHint: {
    fontSize: 10,
    color: '#927b84',
    marginTop: 4,
  },

  totalAmount: {
    fontSize: 21,
    fontWeight: '800',
    color: '#d96b8a',
  },

  progressNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E8',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },

  progressText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8d672f',
  },

  continueButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 12,
    padding: 16,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },

  continueButtonDisabled: {
    backgroundColor: '#D8B8C3',
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },

  emptyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: '#d96b8a',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  modalSheet: {
    width: '100%',
    height: '85%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  modalSheetTablet: {
    width: '85%',
    maxWidth: MODAL_MAX_WIDTH,
    height: '85%',
    maxHeight: 850,
    borderRadius: 24,
    marginBottom: 20,
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
    minWidth: 0,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#333',
  },

  modalSubtitle: {
    fontSize: 13,
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
    marginLeft: 10,
  },

  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
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
    gap: 10,
  },

  optionCardSelected: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff7fa',
  },

  optionCardInfo: {
    flex: 1,
    minWidth: 0,
  },

  optionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },

  optionDescription: {
    fontSize: 11,
    lineHeight: 16,
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
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
});
