
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../../../supabase';

type Fabric = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_addition: number;
  available: boolean;
};

const PINK = '#d96b8a';
const DARK_PINK = '#B84470';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export default function FabricsScreen() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 430;
  const isTablet = width >= 768;

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAddition, setPriceAddition] = useState('0');
  const [available, setAvailable] = useState(true);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');

  // =====================================================
  // LOAD FABRICS
  // =====================================================

  const getFabrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (fabrics.length === 0) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('fabrics')
        .select(
          'id, name, description, image_url, price_addition, available'
        )
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setFabrics((data ?? []) as Fabric[]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load fabrics.';

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fabrics.length]);

  useFocusEffect(
    useCallback(() => {
      void getFabrics();
    }, [getFabrics])
  );

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingFabric(null);
    setName('');
    setDescription('');
    setPriceAddition('0');
    setAvailable(true);
    setImageUri(null);
    setImageBase64(null);
    setImageType('image/jpeg');
  };

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const openEditModal = (fabric: Fabric) => {
    setEditingFabric(fabric);
    setName(fabric.name);
    setDescription(fabric.description ?? '');
    setPriceAddition(String(fabric.price_addition ?? 0));
    setAvailable(fabric.available);
    setImageUri(fabric.image_url);
    setImageBase64(null);
    setImageType('image/jpeg');

    setModalVisible(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    resetForm();
  };

  // =====================================================
  // PICK IMAGE
  // =====================================================

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to select a fabric image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      const mimeType = asset.mimeType ?? 'image/jpeg';

      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        Alert.alert(
          'Invalid Image',
          'Please select a JPG, PNG, or WEBP image.'
        );
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          'Image Too Large',
          'Please select an image that is 5 MB or smaller.'
        );
        return;
      }

      if (!asset.base64) {
        Alert.alert(
          'Image Error',
          'The selected image could not be processed. Please choose another image.'
        );
        return;
      }

      setImageUri(asset.uri);
      setImageBase64(asset.base64);
      setImageType(mimeType);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to select image.';

      Alert.alert('Image Error', message);
    }
  };

  // =====================================================
  // UPLOAD IMAGE
  // =====================================================

  const uploadImage = async (): Promise<{
    url: string;
    path: string;
  } | null> => {
    if (!imageBase64) return null;

    const extension =
      imageType === 'image/png'
        ? 'png'
        : imageType === 'image/webp'
          ? 'webp'
          : 'jpg';

    const filePath = `fabrics/fabric-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from('garments')
      .upload(filePath, decode(imageBase64), {
        contentType: imageType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
      .from('garments')
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      path: filePath,
    };
  };

  // =====================================================
  // GET STORAGE IMAGE PATH
  // =====================================================

  const getStoragePath = (imageUrl: string | null) => {
    if (!imageUrl) return null;

    const marker = '/garments/';
    const index = imageUrl.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(
      imageUrl.substring(index + marker.length).split('?')[0]
    );
  };

  // =====================================================
  // REMOVE IMAGE FROM STORAGE
  // =====================================================

  const removeStorageImage = async (imageUrl: string | null) => {
    const path = getStoragePath(imageUrl);

    if (!path) return;

    const { error } = await supabase.storage
      .from('garments')
      .remove([path]);

    if (error) {
      console.log('Storage image removal error:', error.message);
    }
  };

  const removeStoragePath = async (path: string | null) => {
    if (!path) return;

    const { error } = await supabase.storage
      .from('garments')
      .remove([path]);

    if (error) {
      console.log('New image cleanup error:', error.message);
    }
  };

  // =====================================================
  // SAVE FABRIC
  // =====================================================

  const saveFabric = async () => {
    const trimmedName = name.trim();
    const parsedPrice = Number(priceAddition);

    if (!trimmedName) {
      Alert.alert('Missing Information', 'Please enter a fabric name.');
      return;
    }

    if (
      priceAddition.trim() === '' ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0
    ) {
      Alert.alert(
        'Invalid Price',
        'Please enter a valid price addition of zero or more.'
      );
      return;
    }

    if (description.trim().length > 500) {
      Alert.alert(
        'Description Too Long',
        'Please keep the description within 500 characters.'
      );
      return;
    }

    setSaving(true);

    let uploadedImagePath: string | null = null;

    try {
      let newImageUrl = imageUri;

      if (imageBase64) {
        const uploadedImage = await uploadImage();

        if (!uploadedImage) {
          throw new Error('Unable to upload the selected image.');
        }

        newImageUrl = uploadedImage.url;
        uploadedImagePath = uploadedImage.path;
      }

      const fabricData = {
        name: trimmedName,
        description: description.trim() || null,
        image_url: newImageUrl,
        price_addition: parsedPrice,
        available,
      };

      if (editingFabric) {
        const { error } = await supabase
          .from('fabrics')
          .update(fabricData)
          .eq('id', editingFabric.id);

        if (error) {
          throw error;
        }

        // Delete the previous image only after the database update succeeds.
        if (imageBase64 && editingFabric.image_url) {
          await removeStorageImage(editingFabric.image_url);
        }

        setModalVisible(false);
        resetForm();

        Alert.alert('Success', 'Fabric updated successfully.');
      } else {
        const { error } = await supabase
          .from('fabrics')
          .insert([fabricData]);

        if (error) {
          throw error;
        }

        setModalVisible(false);
        resetForm();

        Alert.alert('Success', 'Fabric added successfully.');
      }

      await getFabrics();
    } catch (error) {
      // Clean up the newly uploaded image if saving to the database failed.
      if (uploadedImagePath) {
        await removeStoragePath(uploadedImagePath);
      }

      const message =
        error instanceof Error ? error.message : 'Something went wrong.';

      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // TOGGLE FABRIC AVAILABILITY
  // =====================================================

  const toggleAvailability = (fabric: Fabric) => {
    const newAvailability = !fabric.available;

    const actionText = newAvailability ? 'enable' : 'disable';
    const statusText = newAvailability ? 'available' : 'unavailable';

    Alert.alert(
      `${newAvailability ? 'Enable' : 'Disable'} Fabric`,
      `Are you sure you want to ${actionText} "${fabric.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: newAvailability ? 'Enable' : 'Disable',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('fabrics')
                .update({ available: newAvailability })
                .eq('id', fabric.id);

              if (error) throw error;

              setFabrics((current) =>
                current.map((item) =>
                  item.id === fabric.id
                    ? { ...item, available: newAvailability }
                    : item
                )
              );

              Alert.alert(
                'Success',
                `${fabric.name} is now ${statusText}.`
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Unable to update fabric availability.';

              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // DELETE FABRIC
  // =====================================================

  const deleteFabric = (fabric: Fabric) => {
    Alert.alert(
      'Delete Fabric',
      `Are you sure you want to permanently delete "${fabric.name}"?`,
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
              const { error } = await supabase
                .from('fabrics')
                .delete()
                .eq('id', fabric.id);

              if (error) {
                throw error;
              }

              setFabrics((current) =>
                current.filter((item) => item.id !== fabric.id)
              );

              await removeStorageImage(fabric.image_url);

              Alert.alert('Success', 'Fabric deleted successfully.');
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Unable to delete this fabric.';

              Alert.alert(
                'Unable to Delete',
                `${message}\n\nThis fabric may already be used in an existing order.`
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // RENDER FABRIC CARD
  // =====================================================

  const renderFabric = ({ item }: { item: Fabric }) => (
    <View
      style={[
        styles.card,
        isSmallScreen && styles.cardSmall,
        isTablet && styles.cardTablet,
      ]}
    >
      <View style={styles.fabricMain}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={[
              styles.fabricImage,
              isSmallScreen && styles.fabricImageSmall,
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardIcon,
              isSmallScreen && styles.fabricImageSmall,
            ]}
          >
            <Ionicons name="layers-outline" size={28} color={PINK} />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : (
            <Text style={styles.noDescription}>No description</Text>
          )}

          <Text style={styles.price}>
            +₱
            {Number(item.price_addition || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                item.available
                  ? styles.availableDot
                  : styles.unavailableDot,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                item.available
                  ? styles.availableText
                  : styles.unavailableText,
              ]}
            >
              {item.available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={17} color="#fff" />
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.availabilityButton,
            item.available ? styles.disableButton : styles.enableButton,
          ]}
          onPress={() => toggleAvailability(item)}
        >
          <Ionicons
            name={item.available ? 'eye-off-outline' : 'eye-outline'}
            size={17}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {item.available ? 'Disable' : 'Enable'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteFabric(item)}
        >
          <Ionicons name="trash-outline" size={17} color="#fff" />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View
      style={[
        styles.container,
        isSmallScreen && styles.containerSmall,
        isTablet && styles.containerTablet,
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Fabrics</Text>
          <Text style={styles.subtitle}>
            Manage your fabric options and prices
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{fabrics.length}</Text>
          <Text style={styles.countLabel}>Fabrics</Text>
        </View>
      </View>

      {/* ADD BUTTON */}

      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.addButtonText}>Add Fabric</Text>
      </TouchableOpacity>

      {/* FABRIC LIST */}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={styles.loadingText}>Loading fabrics...</Text>
        </View>
      ) : (
        <FlatList
          data={fabrics}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            isTablet && styles.listTablet,
          ]}
          renderItem={renderFabric}
          onRefresh={() => getFabrics(true)}
          refreshing={refreshing}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="layers-outline"
                size={55}
                color="#ddd"
              />

              <Text style={styles.emptyTitle}>No Fabrics Yet</Text>

              <Text style={styles.emptyText}>
                Add your first fabric to get started.
              </Text>
            </View>
          }
        />
      )}

      {/* ADD / EDIT MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalOverlay,
            isTablet && styles.modalOverlayTablet,
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.modalContainer,
              isTablet && styles.modalContainerTablet,
            ]}
          >
            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  {editingFabric ? 'Edit Fabric' : 'Add Fabric'}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingFabric
                    ? 'Update fabric information'
                    : 'Create a new fabric option'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* SCROLLABLE FORM */}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              {/* IMAGE PICKER */}

              <Text style={styles.label}>Fabric Image</Text>

              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={saving}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={35}
                      color={PINK}
                    />

                    <Text style={styles.imagePickerTitle}>
                      Select Fabric Image
                    </Text>

                    <Text style={styles.imagePickerSubtitle}>
                      JPG, PNG, or WEBP • Maximum 5 MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {imageUri && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => {
                    setImageUri(null);
                    setImageBase64(null);
                  }}
                  disabled={saving}
                >
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color="#d9534f"
                  />
                  <Text style={styles.removeImageText}>
                    Remove Image
                  </Text>
                </TouchableOpacity>
              )}

              {/* NAME */}

              <Text style={styles.label}>Fabric Name</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter fabric name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                editable={!saving}
                maxLength={100}
              />

              {/* DESCRIPTION */}

              <Text style={styles.label}>Description</Text>

              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Enter fabric description"
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                editable={!saving}
                maxLength={500}
              />

              <Text style={styles.characterCount}>
                {description.length}/500 characters
              </Text>

              {/* PRICE */}

              <Text style={styles.label}>Price Addition (₱)</Text>

              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#999"
                value={priceAddition}
                onChangeText={setPriceAddition}
                keyboardType="decimal-pad"
                editable={!saving}
              />

              {/* AVAILABILITY */}

              <Text style={styles.label}>Availability</Text>

              <TouchableOpacity
                style={[
                  styles.availabilitySelector,
                  available
                    ? styles.availabilitySelectorOn
                    : styles.availabilitySelectorOff,
                ]}
                onPress={() => setAvailable(!available)}
                disabled={saving}
              >
                <View
                  style={[
                    styles.availabilityIcon,
                    available
                      ? styles.availabilityIconOn
                      : styles.availabilityIconOff,
                  ]}
                >
                  <Ionicons
                    name={available ? 'checkmark' : 'close'}
                    size={18}
                    color="#fff"
                  />
                </View>

                <View style={styles.availabilityInfo}>
                  <Text style={styles.availabilityTitle}>
                    {available ? 'Available' : 'Unavailable'}
                  </Text>

                  <Text style={styles.availabilityDescription}>
                    {available
                      ? 'Customers can select this fabric.'
                      : 'Customers cannot select this fabric.'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.switchTrack,
                    available
                      ? styles.switchTrackOn
                      : styles.switchTrackOff,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      available
                        ? styles.switchThumbOn
                        : styles.switchThumbOff,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* SAVE */}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveFabric}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={editingFabric ? 'checkmark' : 'add'}
                      size={21}
                      color="#fff"
                    />

                    <Text style={styles.saveButtonText}>
                      {editingFabric ? 'Save Changes' : 'Add Fabric'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* CANCEL */}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    padding: 20,
  },

  containerSmall: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },

  containerTablet: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },

  // HEADER

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },

  countBadge: {
    backgroundColor: '#FCE7F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 75,
  },

  countText: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_PINK,
  },

  countLabel: {
    fontSize: 10,
    color: DARK_PINK,
    marginTop: 1,
  },

  // ADD BUTTON

  addButton: {
    backgroundColor: PINK,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 18,
  },

  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // LIST

  list: {
    paddingBottom: 30,
    flexGrow: 1,
  },

  listTablet: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },

  // FABRIC CARD

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e2e7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  cardSmall: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  cardTablet: {
    padding: 18,
  },

  fabricMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  fabricImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FCE7F0',
    marginRight: 12,
  },

  fabricImageSmall: {
    width: 58,
    height: 58,
  },

  info: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },

  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },

  description: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
    lineHeight: 18,
  },

  noDescription: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 4,
  },

  price: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_PINK,
    marginTop: 5,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  availableDot: {
    backgroundColor: '#28a745',
  },

  unavailableDot: {
    backgroundColor: '#999',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  availableText: {
    color: '#28a745',
  },

  unavailableText: {
    color: '#888',
  },

  // ACTION BUTTONS

  actions: {
    flexDirection: 'column',
    gap: 7,
  },

  editButton: {
    backgroundColor: '#777',
    minWidth: 78,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  availabilityButton: {
    minWidth: 78,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  disableButton: {
    backgroundColor: '#d99a3d',
  },

  enableButton: {
    backgroundColor: '#28a745',
  },

  deleteButton: {
    backgroundColor: '#d9534f',
    minWidth: 78,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // LOADING

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#888',
    fontSize: 14,
  },

  // EMPTY

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555',
    marginTop: 15,
  },

  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },

  modalOverlayTablet: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    maxHeight: '90%',
    flexShrink: 1,
    width: '100%',
  },

  modalContainerTablet: {
    width: '85%',
    maxWidth: 620,
    borderRadius: 24,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  modalTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  formContent: {
    paddingBottom: 15,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 18,
  },

  descriptionInput: {
    height: 100,
    paddingTop: 13,
    marginBottom: 4,
  },

  characterCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginBottom: 18,
  },

  // IMAGE PICKER

  imagePicker: {
    height: 150,
    borderWidth: 1,
    borderColor: '#e6d5dc',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFF8FA',
    overflow: 'hidden',
    marginBottom: 10,
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  imagePickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginTop: 8,
  },

  imagePickerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 5,
    marginBottom: 18,
    paddingVertical: 5,
  },

  removeImageText: {
    color: '#d9534f',
    fontSize: 12,
    fontWeight: '600',
  },

  // AVAILABILITY SELECTOR

  availabilitySelector: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  availabilitySelectorOn: {
    borderColor: '#bfe8c8',
    backgroundColor: '#f4fcf6',
  },

  availabilitySelectorOff: {
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },

  availabilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  availabilityIconOn: {
    backgroundColor: '#28a745',
  },

  availabilityIconOff: {
    backgroundColor: '#999',
  },

  availabilityInfo: {
    flex: 1,
    paddingRight: 8,
  },

  availabilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  availabilityDescription: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    lineHeight: 15,
  },

  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },

  switchTrackOn: {
    backgroundColor: PINK,
  },

  switchTrackOff: {
    backgroundColor: '#ccc',
  },

  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },

  switchThumbOn: {
    alignSelf: 'flex-end',
  },

  switchThumbOff: {
    alignSelf: 'flex-start',
  },

  // SAVE AND CANCEL

  saveButton: {
    backgroundColor: PINK,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 6,
  },

  cancelButtonText: {
    color: '#777',
    fontSize: 15,
    fontWeight: '600',
  },
});
