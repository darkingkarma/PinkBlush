import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  Image,
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
  supabase,
} from '../../../supabase';

import {
  RootStackParamList,
} from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'GarmentDetails'
>;

type Part = {
  id: string;
  garment_id: string;
  name: string;
  description: string | null;
  price: number;
  gender: string;
  available: boolean;
};

type Design = {
  id: string;
  garment_part_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type Fabric = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_addition: number;
  available: boolean;
};

type GarmentFabric = {
  id: string;
  garment_part_id: string;
  fabric_id: string;
};

export default function GarmentDetailsScreen({
  route,
  navigation,
}: Props) {
  const { garment } = route.params;

  const [parts, setParts] = useState<Part[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [garmentFabrics, setGarmentFabrics] = useState<
    GarmentFabric[]
  >([]);
  const [loading, setLoading] = useState(false);

  const getData = async () => {
    setLoading(true);

    const { data: partsData, error: partsError } =
      await supabase
        .from('garment_parts')
        .select('*')
        .eq('garment_id', garment.id)
        .order('name');

    if (partsError) {
      Alert.alert(
        'Error',
        partsError.message
      );
      setLoading(false);
      return;
    }

    const partIds =
      (partsData || []).map(
        (part) => part.id
      );

    let designsData: Design[] = [];

    if (partIds.length > 0) {
      const { data, error: designsError } =
        await supabase
          .from('designs')
          .select('*')
          .in(
            'garment_part_id',
            partIds
          );

      if (designsError) {
        Alert.alert(
          'Error',
          designsError.message
        );
        setLoading(false);
        return;
      }

      designsData = data || [];
    }

    const { data: fabricsData, error: fabricsError } =
      await supabase
        .from('fabrics')
        .select('*')
        .order('name');

    if (fabricsError) {
      Alert.alert(
        'Error',
        fabricsError.message
      );
      setLoading(false);
      return;
    }

    let garmentFabricsData: GarmentFabric[] = [];

    if (partIds.length > 0) {
      const { data, error: garmentFabricsError } =
        await supabase
          .from('garment_fabrics')
          .select('*')
          .in(
            'garment_part_id',
            partIds
          );

      if (garmentFabricsError) {
        Alert.alert(
          'Error',
          garmentFabricsError.message
        );
        setLoading(false);
        return;
      }

      garmentFabricsData = data || [];
    }

    setParts(partsData || []);
    setDesigns(designsData);
    setFabrics(fabricsData || []);
    setGarmentFabrics(garmentFabricsData);

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      getData();
    }, [])
  );

  const deleteDesign = async (
    design: Design
  ) => {
    Alert.alert(
      'Delete Design',
      `Are you sure you want to delete "${design.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (design.image_url) {
                const imagePath =
                  design.image_url.split('/garments/')[1];

                if (imagePath) {
                  await supabase.storage
                    .from('garments')
                    .remove([imagePath]);
                }
              }

              const { error } = await supabase
                .from('designs')
                .delete()
                .eq('id', design.id);

              if (error) {
                throw error;
              }

              getData();
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message
              );
            }
          },
        },
      ]
    );
  };

  const toggleFabric = async (
    partId: string,
    fabricId: string
  ) => {
    const existingAssignment =
      garmentFabrics.find(
        (item) =>
          item.garment_part_id === partId &&
          item.fabric_id === fabricId
      );

    try {
      if (existingAssignment) {
        const { error } = await supabase
          .from('garment_fabrics')
          .delete()
          .eq(
            'id',
            existingAssignment.id
          );

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('garment_fabrics')
          .insert({
            garment_part_id: partId,
            fabric_id: fabricId,
          });

        if (error) {
          throw error;
        }
      }

      getData();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message
      );
    }
  };

  const renderPart = ({
    item,
  }: {
    item: Part;
  }) => {
    const partDesigns = designs.filter(
      (design) =>
        design.garment_part_id === item.id
    );

    const partFabricAssignments =
      garmentFabrics.filter(
        (assignment) =>
          assignment.garment_part_id === item.id
      );

    const partFabrics = partFabricAssignments
      .map((assignment) =>
        fabrics.find(
          (fabric) =>
            fabric.id === assignment.fabric_id
        )
      )
      .filter(
        (fabric): fabric is Fabric =>
          fabric !== undefined
      );

    return (
      <View style={styles.partCard}>
        <View style={styles.partHeader}>
          <View>
            <Text style={styles.partName}>
              {item.name}
            </Text>

            <Text style={styles.partInfo}>
              Gender: {item.gender}
            </Text>

            <Text style={styles.partInfo}>
              Price: ₱
              {Number(item.price).toFixed(2)}
            </Text>

            <Text
              style={[
                styles.status,
                {
                  color: item.available
                    ? '#2e8b57'
                    : '#cc3333',
                },
              ]}
            >
              {item.available
                ? 'Available'
                : 'Not Available'}
            </Text>
          </View>

          <View style={styles.partActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate(
                  'EditGarmentPart',
                  {
                    part: item,
                  }
                )
              }
            >
              <Text style={styles.editText}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Delete Part',
                  `Are you sure you want to delete "${item.name}"?`,
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const {
                            data: partDesigns,
                            error: designsError,
                          } = await supabase
                            .from('designs')
                            .select(
                              'image_url'
                            )
                            .eq(
                              'garment_part_id',
                              item.id
                            );

                          if (designsError) {
                            throw designsError;
                          }

                          const imagePaths =
                            (partDesigns || [])
                              .filter(
                                (design) =>
                                  design.image_url
                              )
                              .map((design) => {
                                return design
                                  .image_url!
                                  .split(
                                    '/garments/'
                                  )[1];
                              })
                              .filter(Boolean);

                          if (
                            imagePaths.length >
                            0
                          ) {
                            const {
                              error:
                                storageError,
                            } =
                              await supabase.storage
                                .from(
                                  'garments'
                                )
                                .remove(
                                  imagePaths
                                );

                            if (
                              storageError
                            ) {
                              throw storageError;
                            }
                          }

                          const { error } =
                            await supabase
                              .from(
                                'garment_parts'
                              )
                              .delete()
                              .eq(
                                'id',
                                item.id
                              );

                          if (error) {
                            throw error;
                          }

                          getData();
                        } catch (
                          error: any
                        ) {
                          Alert.alert(
                            'Error',
                            error.message
                          );
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.deleteText}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.description}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.designSection}>
          <Text style={styles.designTitle}>
            Designs
          </Text>

          {partDesigns.length === 0 ? (
            <Text style={styles.noDesigns}>
              No designs added yet.
            </Text>
          ) : (
            partDesigns.map((design) => (
              <View
                key={design.id}
                style={styles.designCard}
              >
                {design.image_url ? (
                  <Image
                    source={{
                      uri: design.image_url,
                    }}
                    style={styles.designImage}
                  />
                ) : null}

                <View style={styles.designInfo}>
                  <Text
                    style={styles.designName}
                  >
                    {design.name}
                  </Text>

                  {design.description ? (
                    <Text
                      style={
                        styles.designDescription
                      }
                    >
                      {design.description}
                    </Text>
                  ) : null}

                  <View
                    style={
                      styles.designActions
                    }
                  >
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() =>
                        navigation.navigate(
                          'EditDesign',
                          {
                            design,
                          }
                        )
                      }
                    >
                      <Text
                        style={styles.editText}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.deleteButton
                      }
                      onPress={() =>
                        deleteDesign(
                          design
                        )
                      }
                    >
                      <Text
                        style={
                          styles.deleteText
                        }
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addDesignButton}
            onPress={() =>
              navigation.navigate(
                'AddDesign',
                {
                  garmentPartId: item.id,
                }
              )
            }
          >
            <Text style={styles.addDesignText}>
              + Add Design
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fabricSection}>
          <Text style={styles.fabricTitle}>
            Fabrics
          </Text>

          {partFabrics.length === 0 ? (
            <Text style={styles.noFabrics}>
              No fabrics assigned yet.
            </Text>
          ) : (
            partFabrics.map((fabric) => (
              <View
                key={fabric.id}
                style={styles.fabricCard}
              >
                <View style={styles.fabricInfo}>
                  <Text
                    style={styles.fabricName}
                  >
                    {fabric.name}
                  </Text>

                  <Text
                    style={styles.fabricPrice}
                  >
                    Price Addition: ₱
                    {Number(
                      fabric.price_addition
                    ).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeFabricButton}
                  onPress={() =>
                    toggleFabric(
                      item.id,
                      fabric.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.removeFabricText
                    }
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.availableFabricTitle}>
            Available Fabrics
          </Text>

          {fabrics
            .filter((fabric) => {
              const assigned =
                garmentFabrics.some(
                  (assignment) =>
                    assignment.garment_part_id ===
                      item.id &&
                    assignment.fabric_id ===
                      fabric.id
                );

              return (
                fabric.available &&
                !assigned
              );
            })
            .map((fabric) => (
              <TouchableOpacity
                key={fabric.id}
                style={styles.availableFabricButton}
                onPress={() =>
                  toggleFabric(
                    item.id,
                    fabric.id
                  )
                }
              >
                <View>
                  <Text
                    style={
                      styles.availableFabricName
                    }
                  >
                    {fabric.name}
                  </Text>

                  <Text
                    style={
                      styles.availableFabricPrice
                    }
                  >
                    Price Addition: ₱
                    {Number(
                      fabric.price_addition
                    ).toFixed(2)}
                  </Text>
                </View>

                <Text
                  style={styles.assignText}
                >
                  Assign
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        renderItem={renderPart}
        refreshing={loading}
        onRefresh={getData}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            {garment.image_url ? (
              <Image
                source={{
                  uri: garment.image_url,
                }}
                style={styles.garmentImage}
              />
            ) : null}

            <Text style={styles.title}>
              {garment.name}
            </Text>

            {garment.description ? (
              <Text
                style={styles.description}
              >
                {garment.description}
              </Text>
            ) : null}

            <Text
              style={[
                styles.status,
                {
                  color: garment.available
                    ? '#2e8b57'
                    : '#cc3333',
                },
              ]}
            >
              {garment.available
                ? 'Available'
                : 'Not Available'}
            </Text>

            <View style={styles.partsHeader}>
              <Text style={styles.partsTitle}>
                Parts
              </Text>

              <TouchableOpacity
                style={
                  styles.addPartButton
                }
                onPress={() =>
                  navigation.navigate(
                    'AddGarmentPart',
                    {
                      garmentId:
                        garment.id,
                    }
                  )
                }
              >
                <Text
                  style={
                    styles.addPartText
                  }
                >
                  + Add Part
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.noParts}>
            No parts added yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  header: {
    marginBottom: 16,
  },

  garmentImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },

  status: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },

  partsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  partsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  addPartButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  addPartText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  partCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
  },

  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  partName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },

  partInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },

  partActions: {
    flexDirection: 'row',
    gap: 8,
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },

  editText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#cc3333',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },

  deleteText: {
    color: '#cc3333',
    fontWeight: '600',
  },

  designSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  designTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  noDesigns: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },

  designCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  designImage: {
    width: 90,
    height: 90,
    borderRadius: 6,
    marginRight: 10,
  },

  designInfo: {
    flex: 1,
  },

  designName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
  },

  designDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },

  designActions: {
    flexDirection: 'row',
    gap: 8,
  },

  addDesignButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 5,
  },

  addDesignText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  fabricSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  fabricTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  noFabrics: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },

  fabricCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },

  fabricInfo: {
    flex: 1,
  },

  fabricName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },

  fabricPrice: {
    fontSize: 13,
    color: '#666',
  },

  removeFabricButton: {
    borderWidth: 1,
    borderColor: '#cc3333',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  removeFabricText: {
    color: '#cc3333',
    fontWeight: '600',
  },

  availableFabricTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
  },

  availableFabricButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },

  availableFabricName: {
    fontSize: 14,
    fontWeight: '600',
  },

  availableFabricPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },

  assignText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  noParts: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});
