
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../../navigator';

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

type DesignFabric = {
  id: string;
  design_id: string;
  fabric_id: string;
};

export default function GarmentDetailsScreen({
  route,
  navigation,
}: Props) {
  const { garment } = route.params;
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 400;
  const isWideScreen = width >= 900;

  const [parts, setParts] = useState<Part[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [garmentFabrics, setGarmentFabrics] = useState<GarmentFabric[]>([]);
  const [designFabrics, setDesignFabrics] = useState<DesignFabric[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [busyActions, setBusyActions] = useState<string[]>([]);

  const setActionBusy = (key: string, busy: boolean) => {
    setBusyActions((current) =>
      busy
        ? [...current, key]
        : current.filter((item) => item !== key),
    );
  };

  const isActionBusy = (key: string) => busyActions.includes(key);

  const getData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh || hasLoaded) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const {
          data: partsData,
          error: partsError,
        } = await supabase
          .from('garment_parts')
          .select('*')
          .eq('garment_id', garment.id)
          .order('name', { ascending: true });

        if (partsError) throw partsError;

        const loadedParts = (partsData ?? []) as Part[];
        const partIds = loadedParts.map((part) => part.id);

        let loadedDesigns: Design[] = [];
        let loadedGarmentFabrics: GarmentFabric[] = [];
        let loadedDesignFabrics: DesignFabric[] = [];

        if (partIds.length > 0) {
          const [
            designsResult,
            garmentFabricsResult,
          ] = await Promise.all([
            supabase
              .from('designs')
              .select('*')
              .in('garment_part_id', partIds)
              .order('name', { ascending: true }),

            supabase
              .from('garment_fabrics')
              .select('*')
              .in('garment_part_id', partIds),
          ]);

          if (designsResult.error) throw designsResult.error;
          if (garmentFabricsResult.error) {
            throw garmentFabricsResult.error;
          }

          loadedDesigns = (designsResult.data ?? []) as Design[];
          loadedGarmentFabrics =
            (garmentFabricsResult.data ?? []) as GarmentFabric[];

          const designIds = loadedDesigns.map((design) => design.id);

          if (designIds.length > 0) {
            const { data, error } = await supabase
              .from('design_fabrics')
              .select('*')
              .in('design_id', designIds);

            if (error) throw error;

            loadedDesignFabrics = (data ?? []) as DesignFabric[];
          }
        }

        const { data: fabricsData, error: fabricsError } =
          await supabase
            .from('fabrics')
            .select('*')
            .order('name', { ascending: true });

        if (fabricsError) throw fabricsError;

        setParts(loadedParts);
        setDesigns(loadedDesigns);
        setFabrics((fabricsData ?? []) as Fabric[]);
        setGarmentFabrics(loadedGarmentFabrics);
        setDesignFabrics(loadedDesignFabrics);
        setHasLoaded(true);
      } catch (error: any) {
        Alert.alert(
          'Unable to Load Garment Details',
          error.message || 'Something went wrong while loading the data.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [garment.id, hasLoaded],
  );

  useFocusEffect(
    useCallback(() => {
      void getData();
    }, [getData]),
  );

  const getStoragePath = (url: string | null) => {
    if (!url) return null;

    const marker = '/garments/';
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) return null;

    const path = url
      .substring(markerIndex + marker.length)
      .split('?')[0];

    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  };

  const removeStorageImages = async (urls: (string | null)[]) => {
    const paths = Array.from(
      new Set(
        urls
          .map(getStoragePath)
          .filter((path): path is string => Boolean(path)),
      ),
    );

    if (paths.length === 0) return;

    const { error } = await supabase.storage
      .from('garments')
      .remove(paths);

    if (error) {
      console.warn('Could not remove garment images:', error.message);
    }
  };

  const deleteDesign = (design: Design) => {
    Alert.alert(
      'Delete Design',
      `Are you sure you want to delete "${design.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const busyKey = `delete-design-${design.id}`;

            if (isActionBusy(busyKey)) return;

            setActionBusy(busyKey, true);

            try {
              // Remove design-fabric assignments first.
              const { error: assignmentError } = await supabase
                .from('design_fabrics')
                .delete()
                .eq('design_id', design.id);

              if (assignmentError) throw assignmentError;

              // Delete the database record before removing its image.
              const { error } = await supabase
                .from('designs')
                .delete()
                .eq('id', design.id);

              if (error) throw error;

              setDesigns((current) =>
                current.filter((item) => item.id !== design.id),
              );

              setDesignFabrics((current) =>
                current.filter(
                  (item) => item.design_id !== design.id,
                ),
              );

              await removeStorageImages([design.image_url]);

              Alert.alert('Success', 'Design deleted successfully.');
            } catch (error: any) {
              Alert.alert(
                'Unable to Delete Design',
                error.message ||
                  'The design could not be deleted. It may be used by an existing order.',
              );
            } finally {
              setActionBusy(busyKey, false);
            }
          },
        },
      ],
    );
  };

  const deletePart = (part: Part) => {
    Alert.alert(
      'Delete Garment Part',
      `Are you sure you want to delete "${part.name}" and its designs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const busyKey = `delete-part-${part.id}`;

            if (isActionBusy(busyKey)) return;

            setActionBusy(busyKey, true);

            try {
              const { data: partDesigns, error: designsError } =
                await supabase
                  .from('designs')
                  .select('id, image_url')
                  .eq('garment_part_id', part.id);

              if (designsError) throw designsError;

              const designIds = (partDesigns ?? []).map(
                (design) => design.id,
              );

              // Remove design-specific fabric assignments.
              if (designIds.length > 0) {
                const { error: designFabricError } = await supabase
                  .from('design_fabrics')
                  .delete()
                  .in('design_id', designIds);

                if (designFabricError) throw designFabricError;
              }

              // Remove designs belonging to this part.
              const { error: deleteDesignsError } = await supabase
                .from('designs')
                .delete()
                .eq('garment_part_id', part.id);

              if (deleteDesignsError) throw deleteDesignsError;

              // Remove garment-part fabric assignments.
              const { error: garmentFabricError } = await supabase
                .from('garment_fabrics')
                .delete()
                .eq('garment_part_id', part.id);

              if (garmentFabricError) throw garmentFabricError;

              // Delete the part after its related records.
              const { error } = await supabase
                .from('garment_parts')
                .delete()
                .eq('id', part.id);

              if (error) throw error;

              setParts((current) =>
                current.filter((item) => item.id !== part.id),
              );

              setDesigns((current) =>
                current.filter(
                  (design) => design.garment_part_id !== part.id,
                ),
              );

              setGarmentFabrics((current) =>
                current.filter(
                  (item) => item.garment_part_id !== part.id,
                ),
              );

              setDesignFabrics((current) =>
                current.filter(
                  (item) => !designIds.includes(item.design_id),
                ),
              );

              await removeStorageImages(
                (partDesigns ?? []).map((design) => design.image_url),
              );

              Alert.alert(
                'Success',
                'Garment part and its designs were deleted.',
              );
            } catch (error: any) {
              Alert.alert(
                'Unable to Delete Part',
                error.message ||
                  'The part could not be deleted. It may be connected to an existing order.',
              );
            } finally {
              setActionBusy(busyKey, false);
            }
          },
        },
      ],
    );
  };

  const toggleFabric = async (
    partId: string,
    fabricId: string,
  ) => {
    const busyKey = `part-fabric-${partId}-${fabricId}`;

    if (isActionBusy(busyKey)) return;

    const existingAssignment = garmentFabrics.find(
      (item) =>
        item.garment_part_id === partId &&
        item.fabric_id === fabricId,
    );

    setActionBusy(busyKey, true);

    try {
      if (existingAssignment) {
        const { error } = await supabase
          .from('garment_fabrics')
          .delete()
          .eq('id', existingAssignment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('garment_fabrics')
          .insert({
            garment_part_id: partId,
            fabric_id: fabricId,
          });

        if (error) throw error;
      }

      await getData(true);
    } catch (error: any) {
      Alert.alert(
        'Fabric Assignment Failed',
        error.message ||
          'Unable to update the fabric assignment.',
      );
    } finally {
      setActionBusy(busyKey, false);
    }
  };

  const toggleDesignFabric = async (
    designId: string,
    fabricId: string,
  ) => {
    const busyKey = `design-fabric-${designId}-${fabricId}`;

    if (isActionBusy(busyKey)) return;

    const existingAssignment = designFabrics.find(
      (item) =>
        item.design_id === designId &&
        item.fabric_id === fabricId,
    );

    setActionBusy(busyKey, true);

    try {
      if (existingAssignment) {
        const { error } = await supabase
          .from('design_fabrics')
          .delete()
          .eq('id', existingAssignment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('design_fabrics')
          .insert({
            design_id: designId,
            fabric_id: fabricId,
          });

        if (error) throw error;
      }

      await getData(true);

      Alert.alert(
        'Success',
        existingAssignment
          ? 'Fabric removed from this design.'
          : 'Fabric assigned to this design.',
      );
    } catch (error: any) {
      Alert.alert(
        'Fabric Assignment Failed',
        error.message ||
          'Unable to update the design fabric assignment.',
      );
    } finally {
      setActionBusy(busyKey, false);
    }
  };

  const renderFabricRow = (
    fabric: Fabric,
    action: 'assign-part' | 'remove-part' | 'assign-design' | 'remove-design',
    partId?: string,
    designId?: string,
  ) => {
    const isDesignAction =
      action === 'assign-design' || action === 'remove-design';

    const busyKey = isDesignAction
      ? `design-fabric-${designId}-${fabric.id}`
      : `part-fabric-${partId}-${fabric.id}`;

    const isRemoving =
      action === 'remove-part' || action === 'remove-design';

    const onPress = () => {
      if (isDesignAction && designId) {
        void toggleDesignFabric(designId, fabric.id);
      } else if (partId) {
        void toggleFabric(partId, fabric.id);
      }
    };

    return (
      <View
        key={`${action}-${fabric.id}`}
        style={styles.fabricRow}
      >
        <View style={styles.fabricInfo}>
          <Text style={styles.fabricName}>{fabric.name}</Text>

          <Text style={styles.fabricPrice}>
            Price Addition: ₱
            {Number(fabric.price_addition).toFixed(2)}
          </Text>

          {!fabric.available && (
            <Text style={styles.unavailableFabric}>
              Currently unavailable
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.fabricActionButton,
            isRemoving
              ? styles.removeFabricButton
              : styles.assignFabricButton,
            isActionBusy(busyKey) && styles.disabledButton,
          ]}
          onPress={onPress}
          disabled={isActionBusy(busyKey)}
          activeOpacity={0.75}
        >
          {isActionBusy(busyKey) ? (
            <ActivityIndicator
              size="small"
              color={isRemoving ? '#cc4444' : '#d96b8a'}
            />
          ) : (
            <Text
              style={[
                styles.fabricActionText,
                isRemoving
                  ? styles.removeFabricText
                  : styles.assignText,
              ]}
            >
              {isRemoving ? 'Remove' : '+ Assign'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPart = ({ item }: { item: Part }) => {
    const partDesigns = designs.filter(
      (design) => design.garment_part_id === item.id,
    );

    const partFabricAssignments = garmentFabrics.filter(
      (assignment) => assignment.garment_part_id === item.id,
    );

    const partFabricIds = partFabricAssignments.map(
      (assignment) => assignment.fabric_id,
    );

    const partFabrics = partFabricIds
      .map((fabricId) =>
        fabrics.find((fabric) => fabric.id === fabricId),
      )
      .filter((fabric): fabric is Fabric => Boolean(fabric));

    const availableForPart = fabrics.filter(
      (fabric) =>
        fabric.available && !partFabricIds.includes(fabric.id),
    );

    const deleteBusy = isActionBusy(`delete-part-${item.id}`);

    return (
      <View style={styles.partCard}>
        <View style={styles.partHeader}>
          <View style={styles.partDetails}>
            <Text style={styles.partName}>{item.name}</Text>

            <View style={styles.partMetaRow}>
              <Text style={styles.partMeta}>
                Gender: {item.gender}
              </Text>
              <Text style={styles.partMeta}>
                Price: ₱{Number(item.price).toFixed(2)}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                item.available
                  ? styles.availableBadge
                  : styles.unavailableBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.available
                    ? styles.availableText
                    : styles.unavailableText,
                ]}
              >
                {item.available ? 'Available' : 'Not Available'}
              </Text>
            </View>
          </View>

          <View style={styles.partActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate('EditGarmentPart', {
                  part: item,
                })
              }
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                deleteBusy && styles.disabledButton,
              ]}
              disabled={deleteBusy}
              onPress={() => deletePart(item)}
            >
              {deleteBusy ? (
                <ActivityIndicator size="small" color="#cc4444" />
              ) : (
                <Text style={styles.deleteText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.partDescription}>
            {item.description}
          </Text>
        ) : null}

        {/* DESIGNS */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text style={styles.sectionTitle}>Designs</Text>
              <Text style={styles.sectionSubtitle}>
                {partDesigns.length} design(s)
              </Text>
            </View>

            <TouchableOpacity
              style={styles.smallAddButton}
              onPress={() =>
                navigation.navigate('AddDesign', {
                  garmentPartId: item.id,
                })
              }
            >
              <Text style={styles.smallAddButtonText}>
                + Add Design
              </Text>
            </TouchableOpacity>
          </View>

          {partDesigns.length === 0 ? (
            <Text style={styles.emptyText}>
              No designs added yet.
            </Text>
          ) : (
            partDesigns.map((design) => {
              const assignedDesignFabrics = designFabrics.filter(
                (assignment) => assignment.design_id === design.id,
              );

              const assignedDesignFabricIds =
                assignedDesignFabrics.map(
                  (assignment) => assignment.fabric_id,
                );

              const assignedFabrics = assignedDesignFabricIds
                .map((fabricId) =>
                  fabrics.find((fabric) => fabric.id === fabricId),
                )
                .filter((fabric): fabric is Fabric => Boolean(fabric));

              const availableForDesign = partFabrics.filter(
                (fabric) =>
                  fabric.available &&
                  !assignedDesignFabricIds.includes(fabric.id),
              );

              const deleteDesignBusy = isActionBusy(
                `delete-design-${design.id}`,
              );

              return (
                <View key={design.id} style={styles.designCard}>
                  {design.image_url ? (
                    <Image
                      source={{ uri: design.image_url }}
                      style={[
                        styles.designImage,
                        {
                          height: isSmallScreen ? 135 : 175,
                        },
                      ]}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.designImage,
                        styles.imagePlaceholder,
                        {
                          height: isSmallScreen ? 100 : 120,
                        },
                      ]}
                    >
                      <Text style={styles.imagePlaceholderText}>
                        No Design Image
                      </Text>
                    </View>
                  )}

                  <View style={styles.designInfo}>
                    <Text style={styles.designName}>
                      {design.name}
                    </Text>

                    {design.description ? (
                      <Text style={styles.designDescription}>
                        {design.description}
                      </Text>
                    ) : null}

                    <View style={styles.designActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          navigation.navigate('EditDesign', {
                            design,
                          })
                        }
                      >
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.deleteButton,
                          deleteDesignBusy && styles.disabledButton,
                        ]}
                        disabled={deleteDesignBusy}
                        onPress={() => deleteDesign(design)}
                      >
                        {deleteDesignBusy ? (
                          <ActivityIndicator
                            size="small"
                            color="#cc4444"
                          />
                        ) : (
                          <Text style={styles.deleteText}>Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* DESIGN-SPECIFIC FABRICS */}
                  <View style={styles.designFabricSection}>
                    <Text style={styles.subsectionTitle}>
                      Fabrics for This Design
                    </Text>

                    {assignedFabrics.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No fabrics assigned to this design.
                      </Text>
                    ) : (
                      assignedFabrics.map((fabric) =>
                        renderFabricRow(
                          fabric,
                          'remove-design',
                          undefined,
                          design.id,
                        ),
                      )
                    )}

                    <Text style={styles.availableHeading}>
                      Available Fabrics
                    </Text>

                    {availableForDesign.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No additional fabrics available.
                      </Text>
                    ) : (
                      availableForDesign.map((fabric) =>
                        renderFabricRow(
                          fabric,
                          'assign-design',
                          undefined,
                          design.id,
                        ),
                      )
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* GARMENT-PART FABRICS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Fabrics Assigned to This Part
          </Text>

          <Text style={styles.sectionSubtitle}>
            These fabrics can be assigned to designs under this part.
          </Text>

          {partFabrics.length === 0 ? (
            <Text style={styles.emptyText}>
              No fabrics assigned to this part yet.
            </Text>
          ) : (
            partFabrics.map((fabric) =>
              renderFabricRow(fabric, 'remove-part', item.id),
            )
          )}

          <Text style={styles.availableHeading}>
            Available Fabrics
          </Text>

          {availableForPart.length === 0 ? (
            <Text style={styles.emptyText}>
              No additional fabrics available.
            </Text>
          ) : (
            availableForPart.map((fabric) =>
              renderFabricRow(fabric, 'assign-part', item.id),
            )
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.garmentOverview}>
        {garment.image_url ? (
          <Image
            source={{ uri: garment.image_url }}
            style={[
              styles.garmentImage,
              {
                height: isSmallScreen ? 155 : 210,
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.garmentImage,
              styles.imagePlaceholder,
              {
                height: isSmallScreen ? 120 : 150,
              },
            ]}
          >
            <Text style={styles.imagePlaceholderText}>
              No Garment Image
            </Text>
          </View>
        )}

        <View style={styles.garmentInfo}>
          <Text style={styles.garmentEyebrow}>
            GARMENT DETAILS
          </Text>

          <Text style={styles.garmentTitle}>
            {garment.name}
          </Text>

          {garment.description ? (
            <Text style={styles.garmentDescription}>
              {garment.description}
            </Text>
          ) : (
            <Text style={styles.garmentDescription}>
              No description provided.
            </Text>
          )}

          <View
            style={[
              styles.statusBadge,
              garment.available
                ? styles.availableBadge
                : styles.unavailableBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                garment.available
                  ? styles.availableText
                  : styles.unavailableText,
              ]}
            >
              {garment.available ? 'Available' : 'Not Available'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.partsHeader}>
        <View>
          <Text style={styles.partsTitle}>Garment Parts</Text>
          <Text style={styles.sectionSubtitle}>
            Manage parts, designs, and fabric options.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addPartButton}
          onPress={() =>
            navigation.navigate('AddGarmentPart', {
              garmentId: garment.id,
            })
          }
        >
          <Text style={styles.addPartText}>+ Add Part</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        renderItem={renderPart}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#d96b8a" />
              <Text style={styles.loadingText}>
                Loading garment details...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyParts}>
              <Text style={styles.emptyPartsTitle}>
                No Garment Parts Yet
              </Text>
              <Text style={styles.emptyText}>
                Add a garment part to start managing its designs and fabrics.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() =>
                  navigation.navigate('AddGarmentPart', {
                    garmentId: garment.id,
                  })
                }
              >
                <Text style={styles.emptyAddText}>+ Add First Part</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void getData(true)}
            tintColor="#d96b8a"
            colors={['#d96b8a']}
          />
        }
        contentContainerStyle={[
          styles.content,
          isWideScreen && styles.wideContent,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },

  content: {
    padding: 14,
    paddingBottom: 35,
    flexGrow: 1,
  },

  wideContent: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 18,
  },

  garmentOverview: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1dce3',
    padding: 14,
    marginBottom: 20,
  },

  garmentImage: {
    width: '100%',
    borderRadius: 13,
    backgroundColor: '#fff',
    marginBottom: 14,
  },

  imagePlaceholder: {
    backgroundColor: '#fff0f5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  imagePlaceholderText: {
    color: '#b86b83',
    fontSize: 12,
    fontWeight: '600',
  },

  garmentInfo: {
    gap: 5,
  },

  garmentEyebrow: {
    color: '#b86b83',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  garmentTitle: {
    color: '#30242a',
    fontSize: 23,
    fontWeight: '800',
  },

  garmentDescription: {
    color: '#777',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 7,
  },

  availableBadge: {
    backgroundColor: '#eaf7ef',
  },

  unavailableBadge: {
    backgroundColor: '#fff0ef',
  },

  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  availableText: {
    color: '#24834c',
  },

  unavailableText: {
    color: '#d9534f',
  },

  partsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 5,
  },

  partsTitle: {
    color: '#30242a',
    fontSize: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  addPartButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  addPartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  partCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1dce3',
    borderRadius: 16,
    padding: 13,
    marginBottom: 15,
  },

  partHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },

  partDetails: {
    flex: 1,
    minWidth: 170,
  },

  partName: {
    color: '#30242a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 7,
  },

  partMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  partMeta: {
    color: '#777',
    fontSize: 12,
  },

  partActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  editButton: {
    backgroundColor: '#fff0f5',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
  },

  editText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: '800',
  },

  deleteButton: {
    backgroundColor: '#fff0ef',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65,
    minHeight: 34,
  },

  deleteText: {
    color: '#cc4444',
    fontSize: 12,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.55,
  },

  partDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  section: {
    marginTop: 17,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1e5e9',
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 11,
  },

  sectionTitle: {
    color: '#44343b',
    fontSize: 16,
    fontWeight: '800',
  },

  smallAddButton: {
    backgroundColor: '#fff0f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  smallAddButtonText: {
    color: '#d96b8a',
    fontSize: 11,
    fontWeight: '800',
  },

  emptyText: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 7,
  },

  designCard: {
    backgroundColor: '#fffafb',
    borderWidth: 1,
    borderColor: '#f1dce3',
    borderRadius: 12,
    padding: 11,
    marginBottom: 11,
  },

  designImage: {
    width: '100%',
    borderRadius: 9,
    backgroundColor: '#fff',
    marginBottom: 10,
  },

  designInfo: {
    minWidth: 0,
  },

  designName: {
    color: '#30242a',
    fontSize: 15,
    fontWeight: '800',
  },

  designDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  designActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  designFabricSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1dce3',
  },

  subsectionTitle: {
    color: '#b14f71',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  availableHeading: {
    color: '#55434b',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 13,
    marginBottom: 7,
  },

  fabricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e5e9',
    borderRadius: 9,
    padding: 10,
    marginBottom: 7,
  },

  fabricInfo: {
    flex: 1,
    minWidth: 125,
  },

  fabricName: {
    color: '#44343b',
    fontSize: 13,
    fontWeight: '700',
  },

  fabricPrice: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },

  unavailableFabric: {
    color: '#d9534f',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  fabricActionButton: {
    minWidth: 70,
    minHeight: 32,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  assignFabricButton: {
    backgroundColor: '#fff0f5',
  },

  removeFabricButton: {
    backgroundColor: '#fff0ef',
  },

  fabricActionText: {
    fontSize: 11,
    fontWeight: '800',
  },

  assignText: {
    color: '#d96b8a',
  },

  removeFabricText: {
    color: '#cc4444',
  },

  emptyParts: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1dce3',
    borderRadius: 15,
    padding: 25,
    marginTop: 5,
  },

  emptyPartsTitle: {
    color: '#30242a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },

  emptyAddButton: {
    backgroundColor: '#d96b8a',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
    marginTop: 12,
  },

  emptyAddText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
  },

  loadingText: {
    color: '#888',
    fontSize: 12,
    marginTop: 10,
  },
});
