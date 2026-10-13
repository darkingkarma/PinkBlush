import {
  useCallback,
  useState,
} from 'react';

import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

import {
  supabase,
} from '../../../supabase';

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
};

type SelectedFabric = {
  id: string;
  name: string;
  price_addition: number;
};

export default function ConfigurePartsScreen({
  route,
  navigation,
}: Props) {
  const {
    garment,
    selectedPartIds,
    selectedDesign,
    selectedFabric,
  } = route.params;

  const [parts, setParts] =
    useState<GarmentPart[]>([]);

  const [selectedDesigns, setSelectedDesigns] =
    useState<Record<string, SelectedDesign>>({});

  const [selectedFabrics, setSelectedFabrics] =
    useState<Record<string, SelectedFabric>>({});

  const [quantities, setQuantities] =
    useState<Record<string, number>>({});

  const [loading, setLoading] =
    useState(true);

  const getParts = async () => {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from('garment_parts')
      .select(
        'id, name, description, price, gender, available'
      )
      .in('id', selectedPartIds)
      .order('name');

    if (error) {
      console.log(error);
      setParts([]);
      setLoading(false);
      return;
    }

    setParts(data || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getParts();

      if (selectedDesign) {
        setSelectedDesigns((current) => ({
          ...current,
          [selectedDesign.partId]:
            selectedDesign.design,
        }));
      }

      if (selectedFabric) {
        setSelectedFabrics((current) => ({
          ...current,
          [selectedFabric.partId]:
            selectedFabric.fabric,
        }));
      }
    }, [
      selectedDesign,
      selectedFabric,
    ])
  );

  const increaseQuantity = (
    partId: string
  ) => {
    setQuantities((current) => ({
      ...current,
      [partId]:
        (current[partId] || 1) + 1,
    }));
  };

  const decreaseQuantity = (
    partId: string
  ) => {
    setQuantities((current) => {
      const currentQuantity =
        current[partId] || 1;

      if (currentQuantity <= 1) {
        return current;
      }

      return {
        ...current,
        [partId]:
          currentQuantity - 1,
      };
    });
  };

  const getUnitPrice = (
    part: GarmentPart
  ) => {
    const fabricAddition =
      selectedFabrics[part.id]
        ?.price_addition || 0;

    return (
      Number(part.price) +
      Number(fabricAddition)
    );
  };

  const getSubtotal = (
    part: GarmentPart
  ) => {
    const quantity =
      quantities[part.id] || 1;

    return (
      getUnitPrice(part) *
      quantity
    );
  };

  const totalAmount = parts.reduce(
    (total, part) =>
      total + getSubtotal(part),
    0
  );

  const continueToMeasurements = () => {
    const items = parts.map((part) => ({
      partId: part.id,

      partName: part.name,

      designId:
        selectedDesigns[part.id]?.id ||
        null,

      designName:
        selectedDesigns[part.id]?.name ||
        null,

      fabricId:
        selectedFabrics[part.id]?.id ||
        null,

      fabricName:
        selectedFabrics[part.id]?.name ||
        null,

      quantity:
        quantities[part.id] || 1,

      unitPrice:
        getUnitPrice(part),

      subtotal:
        getSubtotal(part),
    }));

    navigation.navigate(
      'OrderMeasurements',
      {
        orderData: {
          garment,
          items,
          totalAmount,
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Configure Parts
        </Text>

        <Text style={styles.subtitle}>
          {garment.name}
        </Text>

        <Text style={styles.helperText}>
          Configure each selected part of your garment.
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Loading selected parts...
          </Text>
        </View>
      ) : (
        <FlatList
          data={parts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>
                  Total
                </Text>

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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.partName}>
                {item.name}
              </Text>

              <Text style={styles.gender}>
                {item.gender}
              </Text>

              <Text style={styles.price}>
                ₱{Number(item.price).toFixed(2)}
              </Text>

              <Text style={styles.description}>
                {item.description ||
                  'No description available.'}
              </Text>

              <TouchableOpacity
                style={styles.optionBox}
                onPress={() =>
                  navigation.navigate(
                    'SelectDesign',
                    {
                      garmentPart: item,
                      garment,
                      selectedPartIds,
                    }
                  )
                }
              >
                <Text style={styles.optionTitle}>
                  Design
                </Text>

                <Text style={styles.optionText}>
                  {selectedDesigns[item.id]
                    ?.name ||
                    'Choose Design'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionBox}
                onPress={() =>
                  navigation.navigate(
                    'SelectFabric',
                    {
                      garmentPart: item,
                      garment,
                      selectedPartIds,
                    }
                  )
                }
              >
                <Text style={styles.optionTitle}>
                  Fabric
                </Text>

                <Text style={styles.optionText}>
                  {selectedFabrics[item.id]
                    ?.name ||
                    'Choose Fabric'}
                </Text>
              </TouchableOpacity>

              <View style={styles.optionBox}>
                <Text style={styles.optionTitle}>
                  Quantity
                </Text>

                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      decreaseQuantity(item.id)
                    }
                  >
                    <Text
                      style={
                        styles.quantityButtonText
                      }
                    >
                      -
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>
                    {quantities[item.id] || 1}
                  </Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      increaseQuantity(item.id)
                    }
                  >
                    <Text
                      style={
                        styles.quantityButtonText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.subtotalBox}>
                <Text style={styles.subtotalLabel}>
                  Subtotal
                </Text>

                <Text style={styles.subtotalAmount}>
                  ₱{getSubtotal(item).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
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
  },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 5,
  },

  description: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 15,
  },

  optionBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  quantityButton: {
    width: 40,
    height: 40,
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
    marginTop: 12,
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

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});
