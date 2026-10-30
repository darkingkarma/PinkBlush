
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ManageGarments'
>;

type Garment = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
  category_id: string;
  image_url: string | null;
  created_at?: string;
};

type Category = {
  id: string;
  name: string;
};

export default function ManageGarmentsScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const [garments, setGarments] = useState<Garment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingGarment, setEditingGarment] =
    useState<Garment | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryDropdownVisible, setCategoryDropdownVisible] =
    useState(false);
  const [available, setAvailable] = useState(true);

  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');

  const loadGarments = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Unable to Load Garments', error.message);
    } else {
      setGarments((data ?? []) as Garment[]);
    }

    setLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('garment_categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      Alert.alert('Unable to Load Categories', error.message);
      return;
    }

    setCategories((data ?? []) as Category[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGarments();
      loadCategories();
    }, [loadGarments, loadCategories]),
  );

  const resetForm = () => {
    setEditingGarment(null);
    setName('');
    setDescription('');
    setSelectedCategory('');
    setCategoryDropdownVisible(false);
    setAvailable(true);
    setImage(null);
    setImageBase64(null);
    setImageType('image/jpeg');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: Garment) => {
    setEditingGarment(item);
    setName(item.name);
    setDescription(item.description ?? '');
    setSelectedCategory(item.category_id);
    setCategoryDropdownVisible(false);
    setAvailable(item.available);
    setImage(item.image_url);
    setImageBase64(null);
    setImageType('image/jpeg');
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setCategoryDropdownVisible(false);
    setModalVisible(false);
    resetForm();
  };

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to select a garment image.',
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

      if (result.canceled) return;

      const selectedImage = result.assets[0];

      setImage(selectedImage.uri);
      setImageBase64(selectedImage.base64 ?? null);
      setImageType(selectedImage.mimeType ?? 'image/jpeg');
    } catch (error: any) {
      Alert.alert(
        'Image Error',
        error.message || 'Unable to select an image.',
      );
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageBase64) return null;

    let extension = 'jpg';

    if (imageType === 'image/png') {
      extension = 'png';
    } else if (imageType === 'image/webp') {
      extension = 'webp';
    } else if (imageType === 'image/gif') {
      extension = 'gif';
    }

    const fileName =
      `garments/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from('garments')
      .upload(fileName, decode(imageBase64), {
        contentType: imageType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

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

  const removeStorageImage = async (url: string | null) => {
    const path = getStoragePath(url);
    if (!path) return;

    const { error } = await supabase.storage
      .from('garments')
      .remove([path]);

    if (error) {
      console.warn('Could not remove storage image:', error.message);
    }
  };

  const saveGarment = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a garment name.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a category.');
      return;
    }

    setSaving(true);

    let newlyUploadedImage: string | null = null;

    try {
      let imageUrl = editingGarment?.image_url ?? null;

      if (imageBase64) {
        newlyUploadedImage = await uploadImage();
        imageUrl = newlyUploadedImage;
      }

      const garmentData = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: selectedCategory,
        image_url: imageUrl,
        available,
      };

      if (editingGarment) {
        const { error } = await supabase
          .from('garments')
          .update(garmentData)
          .eq('id', editingGarment.id);

        if (error) throw error;

        if (
          imageBase64 &&
          editingGarment.image_url &&
          editingGarment.image_url !== imageUrl
        ) {
          await removeStorageImage(editingGarment.image_url);
        }

        setGarments((current) => [
          {
            ...editingGarment,
            ...garmentData,
          },
          ...current.filter(
            (item) => item.id !== editingGarment.id,
          ),
        ]);

        setModalVisible(false);
        resetForm();

        Alert.alert('Success', 'Garment updated successfully.');
      } else {
        const { data, error } = await supabase
          .from('garments')
          .insert(garmentData)
          .select('*')
          .single();

        if (error) throw error;

        setGarments((current) => [
          data as Garment,
          ...current.filter((item) => item.id !== data.id),
        ]);

        setModalVisible(false);
        resetForm();

        Alert.alert('Success', 'Garment added successfully.');
      }
    } catch (error: any) {
      if (newlyUploadedImage) {
        await removeStorageImage(newlyUploadedImage);
      }

      Alert.alert(
        'Unable to Save Garment',
        error.message || 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = (item: Garment) => {
    const nextAvailable = !item.available;

    Alert.alert(
      nextAvailable ? 'Make Available?' : 'Mark Unavailable?',
      `Do you want to ${
        nextAvailable ? 'make' : 'mark'
      } "${item.name}" ${
        nextAvailable ? 'available' : 'unavailable'
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const { error } = await supabase
              .from('garments')
              .update({ available: nextAvailable })
              .eq('id', item.id);

            if (error) {
              Alert.alert('Update Failed', error.message);
              return;
            }

            setGarments((current) =>
              current.map((garment) =>
                garment.id === item.id
                  ? { ...garment, available: nextAvailable }
                  : garment,
              ),
            );
          },
        },
      ],
    );
  };

  const deleteGarment = (item: Garment) => {
    Alert.alert(
      'Delete Garment',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('garments')
              .delete()
              .eq('id', item.id);

            if (error) {
              Alert.alert('Unable to Delete', error.message);
              return;
            }

            setGarments((current) =>
              current.filter((garment) => garment.id !== item.id),
            );

            await removeStorageImage(item.image_url);

            Alert.alert('Success', 'Garment deleted successfully.');
          },
        },
      ],
    );
  };

  const filteredGarments = garments.filter((item) => {
    const query = search.trim().toLowerCase();

    const categoryName =
      categories.find((category) => category.id === item.category_id)
        ?.name ?? '';

    return (
      item.name.toLowerCase().includes(query) ||
      categoryName.toLowerCase().includes(query)
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Garment Management</Text>
        <Text style={styles.subtitle}>
          Manage categories, garments, and fabrics.
        </Text>

        <View style={styles.shortcutRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('GarmentCategories')}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutIcon}>
              <Ionicons name="grid-outline" size={25} color="#d96b8a" />
            </View>
            <Text style={styles.shortcutTitle}>Categories</Text>
            <Text style={styles.shortcutDescription}>
              Manage garment categories
            </Text>
            <Text style={styles.shortcutAction}>Open →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => navigation.navigate('Fabrics')}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutIcon}>
              <Ionicons
                name="color-palette-outline"
                size={25}
                color="#d96b8a"
              />
            </View>
            <Text style={styles.shortcutTitle}>Fabrics</Text>
            <Text style={styles.shortcutDescription}>
              Manage available fabrics
            </Text>
            <Text style={styles.shortcutAction}>Open →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>All Garments</Text>
            <Text style={styles.countText}>
              {garments.length} garment(s)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Garment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search garments or categories..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={19} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#d96b8a"
            style={{ marginTop: 35 }}
          />
        ) : filteredGarments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shirt-outline" size={38} color="#d96b8a" />
            </View>
            <Text style={styles.emptyTitle}>No garments found</Text>
            <Text style={styles.emptyText}>
              {search.trim()
                ? 'Try another search.'
                : 'Add your first garment to get started.'}
            </Text>

            {!search.trim() && (
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyAddText}>Add Garment</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredGarments.map((item) => (
            <View key={item.id} style={styles.garmentCard}>
              <View style={styles.cardTop}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.garmentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.garmentImage,
                      styles.imagePlaceholder,
                    ]}
                  >
                    <Ionicons
                      name="shirt-outline"
                      size={32}
                      color="#d96b8a"
                    />
                  </View>
                )}

                <View style={styles.garmentInfo}>
                  <Text style={styles.garmentName}>{item.name}</Text>

                  <Text style={styles.categoryLabel}>
                    {categories.find(
                      (category) => category.id === item.category_id,
                    )?.name ?? 'Category not found'}
                  </Text>

                  <Text
                    style={styles.garmentDescription}
                    numberOfLines={3}
                  >
                    {item.description || 'No description provided.'}
                  </Text>

                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: item.available
                            ? '#24834c'
                            : '#d9534f',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: item.available
                            ? '#24834c'
                            : '#d9534f',
                        },
                      ]}
                    >
                      {item.available ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.actionRow,
                  isSmallScreen && styles.actionRowSmall,
                ]}
              >
                <TouchableOpacity
                  style={[styles.actionButton, styles.manageButton]}
                  onPress={() =>
                    navigation.navigate('GarmentDetails', {
                      garment: item,
                    })
                  }
                >
                  <Ionicons name="settings-outline" size={16} color="#fff" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color="#d96b8a"
                  />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    item.available
                      ? styles.disableButton
                      : styles.enableButton,
                  ]}
                  onPress={() => toggleAvailability(item)}
                >
                  <Ionicons
                    name={item.available ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={item.available ? '#9a6b13' : '#24834c'}
                  />
                  <Text
                    style={[
                      styles.availabilityButtonText,
                      {
                        color: item.available ? '#9a6b13' : '#24834c',
                      },
                    ]}
                  >
                    {item.available ? 'Disable' : 'Enable'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteGarment(item)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#d9534f"
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
            disabled={saving}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editingGarment ? 'Edit Garment' : 'Add Garment'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingGarment
                    ? 'Update the garment details below.'
                    : 'Fill in the details for your new garment.'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons name="close" size={23} color="#66545b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Garment Image</Text>

              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <View style={styles.imagePickerIcon}>
                      <Ionicons
                        name="image-outline"
                        size={30}
                        color="#d96b8a"
                      />
                    </View>
                    <Text style={styles.imagePickerTitle}>
                      Select garment image
                    </Text>
                    <Text style={styles.imagePickerHint}>
                      Tap here to choose a photo
                    </Text>
                  </View>
                )}

                <View style={styles.cameraBadge}>
                  <Ionicons name="camera-outline" size={18} color="#fff" />
                </View>
              </TouchableOpacity>

              {image && (
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.changeImageButton}
                >
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color="#d96b8a"
                  />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Garment Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Example: SMC Uniform"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
                maxLength={100}
              />

              {/* Category Dropdown */}
              <Text style={styles.label}>Category *</Text>

              <TouchableOpacity
                style={[
                  styles.categoryDropdown,
                  categoryDropdownVisible && styles.categoryDropdownOpen,
                ]}
                onPress={() =>
                  setCategoryDropdownVisible((current) => !current)
                }
                activeOpacity={0.8}
                disabled={categories.length === 0}
              >
                <Text
                  style={[
                    styles.categoryDropdownText,
                    !selectedCategory && styles.categoryPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {categories.find(
                    (category) => category.id === selectedCategory,
                  )?.name ?? 'Select a category'}
                </Text>

                <Ionicons
                  name={
                    categoryDropdownVisible ? 'chevron-up' : 'chevron-down'
                  }
                  size={20}
                  color="#d96b8a"
                />
              </TouchableOpacity>

              {categoryDropdownVisible && categories.length > 0 && (
                <View style={styles.categoryDropdownMenu}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={styles.categoryDropdownScroll}
                    showsVerticalScrollIndicator
                  >
                    {categories.map((category) => {
                      const selected =
                        selectedCategory === category.id;

                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryDropdownOption,
                            selected &&
                              styles.categoryDropdownOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedCategory(category.id);
                            setCategoryDropdownVisible(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryDropdownOptionText,
                              selected &&
                                styles.categoryDropdownOptionTextSelected,
                            ]}
                          >
                            {category.name}
                          </Text>

                          {selected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={19}
                              color="#d96b8a"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {categories.length === 0 && (
                <View style={styles.noCategories}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#b16a80"
                  />
                  <Text style={styles.noCategoriesText}>
                    No categories found. Create a category first.
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Enter an optional description"
                placeholderTextColor="#aaa"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />

              <Text style={styles.label}>Availability</Text>

              <View style={styles.availabilityOptions}>
                <TouchableOpacity
                  style={[
                    styles.availabilityOption,
                    available && styles.availableSelected,
                  ]}
                  onPress={() => setAvailable(true)}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color={available ? '#24834c' : '#999'}
                  />
                  <Text
                    style={[
                      styles.availabilityOptionText,
                      available && styles.availableSelectedText,
                    ]}
                  >
                    Available
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.availabilityOption,
                    !available && styles.unavailableSelected,
                  ]}
                  onPress={() => setAvailable(false)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={19}
                    color={!available ? '#d9534f' : '#999'}
                  />
                  <Text
                    style={[
                      styles.availabilityOptionText,
                      !available && styles.unavailableSelectedText,
                    ]}
                  >
                    Unavailable
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={saveGarment}
                disabled={saving || categories.length === 0}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={
                      editingGarment
                        ? 'checkmark-circle-outline'
                        : 'add-circle-outline'
                    }
                    size={20}
                    color="#fff"
                  />
                )}
                <Text style={styles.saveButtonText}>
                  {saving
                    ? 'Saving...'
                    : editingGarment
                      ? 'Save Changes'
                      : 'Add Garment'}
                </Text>
              </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#30242a',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    marginBottom: 20,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  shortcutCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1dce3',
  },
  shortcutIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#fff0f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    color: '#30242a',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  shortcutDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  shortcutAction: {
    color: '#d96b8a',
    fontWeight: '700',
    marginTop: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#30242a',
  },
  countText: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#d96b8a',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#eee0e5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: '#30242a',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f1dce3',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#fff0f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#30242a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
    backgroundColor: '#d96b8a',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  emptyAddText: {
    color: '#fff',
    fontWeight: '700',
  },
  garmentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#f1dce3',
    padding: 12,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  garmentImage: {
    width: 94,
    height: 108,
    borderRadius: 12,
    backgroundColor: '#fff0f5',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  garmentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#30242a',
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    color: '#b14f71',
    backgroundColor: '#fff0f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    overflow: 'hidden',
  },
  garmentDescription: {
    color: '#777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionRowSmall: {
    gap: 7,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 75,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  manageButton: {
    backgroundColor: '#d96b8a',
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: '#fff0f5',
  },
  editButtonText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: '700',
  },
  enableButton: {
    backgroundColor: '#eaf7ef',
  },
  disableButton: {
    backgroundColor: '#fff5df',
  },
  availabilityButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fff0ef',
  },
  deleteButtonText: {
    color: '#d9534f',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(40, 20, 28, 0.38)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalSheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f4e6eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#30242a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff0f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 25,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#44343b',
    marginTop: 17,
    marginBottom: 8,
  },
  imagePicker: {
    height: 155,
    borderWidth: 1,
    borderColor: '#edcbd7',
    borderStyle: 'dashed',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff8fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  imagePickerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#fce7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  imagePickerTitle: {
    color: '#55434b',
    fontSize: 13,
    fontWeight: '700',
  },
  imagePickerHint: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
  cameraBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#d96b8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    padding: 4,
  },
  changeImageText: {
    color: '#d96b8a',
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#eadde2',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#30242a',
    backgroundColor: '#fff',
  },
  descriptionInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // Category dropdown styles
  categoryDropdown: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eadde2',
    borderRadius: 11,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  categoryDropdownOpen: {
    borderColor: '#d96b8a',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  categoryDropdownText: {
    flex: 1,
    color: '#55434b',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  categoryPlaceholder: {
    color: '#aaa',
    fontWeight: '400',
  },
  categoryDropdownMenu: {
    borderWidth: 1,
    borderColor: '#eadde2',
    borderRadius: 10,
    marginTop: 5,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  categoryDropdownScroll: {
    maxHeight: 180,
  },
  categoryDropdownOption: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f5eaf0',
  },
  categoryDropdownOptionSelected: {
    backgroundColor: '#fff0f5',
  },
  categoryDropdownOptionText: {
    flex: 1,
    color: '#55434b',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  categoryDropdownOptionTextSelected: {
    color: '#d96b8a',
    fontWeight: '800',
  },
  noCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff5f8',
    marginTop: 8,
  },
  noCategoriesText: {
    flex: 1,
    color: '#9a596d',
    fontSize: 12,
    lineHeight: 18,
  },
  availabilityOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  availabilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#eadde2',
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  availableSelected: {
    backgroundColor: '#eaf7ef',
    borderColor: '#b8e2c8',
  },
  unavailableSelected: {
    backgroundColor: '#fff0ef',
    borderColor: '#f0c5c2',
  },
  availabilityOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
  },
  availableSelectedText: {
    color: '#24834c',
  },
  unavailableSelectedText: {
    color: '#d9534f',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d96b8a',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 25,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 5,
  },
  cancelButtonText: {
    color: '#806d75',
    fontSize: 13,
    fontWeight: '700',
  },
});
