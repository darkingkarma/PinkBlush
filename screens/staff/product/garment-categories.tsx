import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  supabase,
} from '../../../supabase';

type Category = {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
  created_at?: string;
};

export default function GarmentCategoriesScreen() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 380;

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [isAvailable, setIsAvailable] =
    useState(true);

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  const getCategories = useCallback(
    async () => {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from('garment_categories')
        .select(
          'id, name, description, is_available, created_at'
        )
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        Alert.alert(
          'Error',
          error.message
        );

        setLoading(false);
        return;
      }

      setCategories(data || []);
      setLoading(false);
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void getCategories();
    }, [getCategories])
  );

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIsAvailable(true);
    setModalVisible(true);
  };

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const openEditModal = (
    category: Category
  ) => {
    setEditingCategory(category);

    setName(category.name);

    setDescription(
      category.description || ''
    );

    setIsAvailable(
      category.is_available
    );

    setModalVisible(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIsAvailable(true);
  };

  // =====================================================
  // SAVE CATEGORY
  // =====================================================

  const saveCategory = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Error',
        'Please enter a category name.'
      );

      return;
    }

    setSaving(true);

    const categoryData = {
      name: name.trim(),
      description:
        description.trim() || null,
      is_available: isAvailable,
    };

    if (editingCategory) {
      // =================================================
      // UPDATE EXISTING CATEGORY
      // =================================================

      const {
        error,
      } = await supabase
        .from('garment_categories')
        .update(categoryData)
        .eq(
          'id',
          editingCategory.id
        );

      if (error) {
        setSaving(false);

        Alert.alert(
          'Error',
          error.message
        );

        return;
      }

      setSaving(false);
      setModalVisible(false);

      setEditingCategory(null);
      setName('');
      setDescription('');
      setIsAvailable(true);

      Alert.alert(
        'Success',
        'Category updated successfully.'
      );

      void getCategories();

    } else {
      // =================================================
      // ADD NEW CATEGORY
      // =================================================

      const {
        error,
      } = await supabase
        .from('garment_categories')
        .insert(categoryData);

      if (error) {
        setSaving(false);

        Alert.alert(
          'Error',
          error.message
        );

        return;
      }

      setSaving(false);
      setModalVisible(false);

      setEditingCategory(null);
      setName('');
      setDescription('');
      setIsAvailable(true);

      Alert.alert(
        'Success',
        'Category added successfully.'
      );

      void getCategories();
    }
  };

  // =====================================================
  // TOGGLE CATEGORY AVAILABILITY
  // =====================================================

  const toggleAvailability = (
    category: Category
  ) => {
    const newAvailability =
      !category.is_available;

    const actionText =
      newAvailability
        ? 'enable'
        : 'disable';

    const statusText =
      newAvailability
        ? 'available'
        : 'unavailable';

    Alert.alert(
      `${newAvailability ? 'Enable' : 'Disable'} Category`,
      `Are you sure you want to ${actionText} "${category.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text:
            newAvailability
              ? 'Enable'
              : 'Disable',

          onPress: async () => {
            const {
              error,
            } = await supabase
              .from('garment_categories')
              .update({
                is_available:
                  newAvailability,
              })
              .eq(
                'id',
                category.id
              );

            if (error) {
              Alert.alert(
                'Error',
                error.message
              );

              return;
            }

            Alert.alert(
              'Success',
              `${category.name} is now ${statusText}.`
            );

            void getCategories();
          },
        },
      ]
    );
  };

  // =====================================================
  // DELETE CATEGORY
  // =====================================================

  const deleteCategory = (
    category: Category
  ) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to permanently delete "${category.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            const {
              error,
            } = await supabase
              .from('garment_categories')
              .delete()
              .eq(
                'id',
                category.id
              );

            if (error) {
              Alert.alert(
                'Error',
                error.message
              );

              return;
            }

            Alert.alert(
              'Success',
              'Category deleted successfully.'
            );

            void getCategories();
          },
        },
      ]
    );
  };

  // =====================================================
  // RENDER CATEGORY
  // =====================================================

  const renderCategory = ({
    item,
  }: {
    item: Category;
  }) => {
    return (
      <View style={styles.card}>

        {/* CATEGORY ICON */}

        <View style={styles.cardIcon}>
          <Ionicons
            name="shirt-outline"
            size={28}
            color="#d96b8a"
          />
        </View>

        {/* CATEGORY INFORMATION */}

        <View
          style={[
            styles.info,
            isSmallScreen &&
              styles.infoSmall,
          ]}
        >
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {item.description ? (
            <Text
              style={styles.description}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : (
            <Text
              style={
                styles.noDescription
              }
            >
              No description
            </Text>
          )}

          {/* AVAILABILITY STATUS */}

          <View
            style={
              styles.statusContainer
            }
          >
            <View
              style={[
                styles.statusDot,
                item.is_available
                  ? styles.availableDot
                  : styles.unavailableDot,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                item.is_available
                  ? styles.availableText
                  : styles.unavailableText,
              ]}
            >
              {item.is_available
                ? 'Available'
                : 'Unavailable'}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}

        <View
          style={[
            styles.actions,
            isSmallScreen &&
              styles.actionsSmall,
          ]}
        >

          {/* EDIT */}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              openEditModal(item)
            }
          >
            <Ionicons
              name="create-outline"
              size={18}
              color="#fff"
            />

            <Text
              style={styles.buttonText}
            >
              Edit
            </Text>
          </TouchableOpacity>

          {/* ENABLE / DISABLE */}

          <TouchableOpacity
            style={[
              styles.availabilityButton,
              item.is_available
                ? styles.disableButton
                : styles.enableButton,
            ]}
            onPress={() =>
              toggleAvailability(item)
            }
          >
            <Ionicons
              name={
                item.is_available
                  ? 'eye-off-outline'
                  : 'eye-outline'
              }
              size={18}
              color="#fff"
            />

            <Text
              style={styles.buttonText}
            >
              {item.is_available
                ? 'Disable'
                : 'Enable'}
            </Text>
          </TouchableOpacity>

          {/* DELETE */}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              deleteCategory(item)
            }
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#fff"
            />

            <Text
              style={styles.buttonText}
            >
              Delete
            </Text>
          </TouchableOpacity>

        </View>

      </View>
    );
  };

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>
            Garment Categories
          </Text>

          <Text style={styles.subtitle}>
            Manage your garment categories
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {categories.length}
          </Text>

          <Text style={styles.countLabel}>
            Categories
          </Text>
        </View>

      </View>

      {/* ADD BUTTON */}

      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
      >
        <Ionicons
          name="add"
          size={22}
          color="#fff"
        />

        <Text style={styles.addButtonText}>
          Add Category
        </Text>
      </TouchableOpacity>

      {/* CATEGORY LIST */}

      {loading ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#d96b8a"
          />

          <Text
            style={styles.loadingText}
          >
            Loading categories...
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) =>
            item.id
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.list
          }
          renderItem={
            renderCategory
          }
          ListEmptyComponent={
            <View
              style={
                styles.emptyContainer
              }
            >
              <Ionicons
                name="shirt-outline"
                size={55}
                color="#ddd"
              />

              <Text
                style={styles.emptyTitle}
              >
                No Categories Yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Add your first garment
                category to get started.
              </Text>
            </View>
          }
        />
      )}

      {/* =====================================================
          ADD / EDIT MODAL
          ===================================================== */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={
          closeModal
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={styles.modalContainer}
          >

            {/* MODAL HEADER */}

            <View
              style={styles.modalHeader}
            >
              <View
                style={
                  styles.modalTitleContainer
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {editingCategory
                    ? 'Edit Category'
                    : 'Add Category'}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {editingCategory
                    ? 'Update category information'
                    : 'Create a new garment category'}
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={closeModal}
                disabled={saving}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#555"
                />
              </TouchableOpacity>
            </View>

            {/* CATEGORY NAME */}

            <Text style={styles.label}>
              Category Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter category name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              editable={!saving}
            />

            {/* DESCRIPTION */}

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Enter category description"
              placeholderTextColor="#999"
              value={description}
              onChangeText={
                setDescription
              }
              multiline
              textAlignVertical="top"
              editable={!saving}
            />

            {/* AVAILABILITY */}

            <Text style={styles.label}>
              Availability
            </Text>

            <TouchableOpacity
              style={[
                styles.availabilitySelector,
                isAvailable
                  ? styles.availabilitySelectorOn
                  : styles.availabilitySelectorOff,
              ]}
              onPress={() =>
                setIsAvailable(
                  !isAvailable
                )
              }
              disabled={saving}
            >
              <View
                style={[
                  styles.availabilityIcon,
                  isAvailable
                    ? styles.availabilityIconOn
                    : styles.availabilityIconOff,
                ]}
              >
                <Ionicons
                  name={
                    isAvailable
                      ? 'checkmark'
                      : 'close'
                  }
                  size={18}
                  color="#fff"
                />
              </View>

              <View
                style={
                  styles.availabilityInfo
                }
              >
                <Text
                  style={
                    styles.availabilityTitle
                  }
                >
                  {isAvailable
                    ? 'Available'
                    : 'Unavailable'}
                </Text>

                <Text
                  style={
                    styles.availabilityDescription
                  }
                >
                  {isAvailable
                    ? 'Customers can see and select this category.'
                    : 'Customers cannot see or select this category.'}
                </Text>
              </View>

              <View
                style={[
                  styles.switchTrack,
                  isAvailable
                    ? styles.switchTrackOn
                    : styles.switchTrackOff,
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    isAvailable
                      ? styles.switchThumbOn
                      : styles.switchThumbOff,
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* SAVE BUTTON */}

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={saveCategory}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  color="#fff"
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      editingCategory
                        ? 'checkmark'
                        : 'add'
                    }
                    size={21}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {editingCategory
                      ? 'Save Changes'
                      : 'Add Category'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* CANCEL */}

            <TouchableOpacity
              style={
                styles.cancelButton
              }
              onPress={closeModal}
              disabled={saving}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

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
    color: '#B84470',
  },

  countLabel: {
    fontSize: 10,
    color: '#B84470',
    marginTop: 1,
  },

  addButton: {
    backgroundColor: '#d96b8a',
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

  list: {
    paddingBottom: 30,
  },

  // =====================================================
  // CATEGORY CARD
  // =====================================================

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e2e7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  info: {
    flex: 1,
    paddingRight: 8,
  },

  infoSmall: {
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

  // =====================================================
  // STATUS
  // =====================================================

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

  // =====================================================
  // ACTIONS
  // =====================================================

  actions: {
    gap: 7,
  },

  actionsSmall: {
    marginTop: 12,
    alignSelf: 'stretch',
  },

  editButton: {
    backgroundColor: '#777',
    minWidth: 75,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  availabilityButton: {
    minWidth: 75,
    paddingVertical: 8,
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
    minWidth: 75,
    paddingVertical: 8,
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

  // =====================================================
  // LOADING
  // =====================================================

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

  // =====================================================
  // EMPTY
  // =====================================================

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

  // =====================================================
  // MODAL
  // =====================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 30,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  },

  // =====================================================
  // AVAILABILITY SELECTOR
  // =====================================================

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
    backgroundColor: '#d96b8a',
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

  // =====================================================
  // SAVE
  // =====================================================

  saveButton: {
    backgroundColor: '#d96b8a',
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