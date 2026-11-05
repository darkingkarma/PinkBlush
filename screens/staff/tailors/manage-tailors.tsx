
import { useCallback, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../supabase';

type Tailor = {
  id: string;
  full_name: string;
  contact_number: string | null;
  is_available: boolean;
  created_at: string;
};

export default function ManageTailorsScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyTailorId, setBusyTailorId] = useState<string | null>(null);

  const hasLoaded = useRef(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTailor, setEditingTailor] =
    useState<Tailor | null>(null);

  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // LOAD TAILORS
  const loadTailors = useCallback(async () => {
    if (hasLoaded.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('tailors')
        .select(
          'id, full_name, contact_number, is_available, created_at'
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTailors((data ?? []) as Tailor[]);
      hasLoaded.current = true;
    } catch (error) {
      console.error('Load tailors error:', error);

      Alert.alert(
        'Unable to Load Tailors',
        error instanceof Error
          ? error.message
          : 'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTailors();
    }, [loadTailors])
  );

  // RESET FORM
  const resetForm = () => {
    setEditingTailor(null);
    setFullName('');
    setContactNumber('');
    setIsAvailable(true);
  };

  // OPEN ADD MODAL
  const openAddModal = () => {
    if (saving) return;

    resetForm();
    setModalVisible(true);
  };

  // OPEN EDIT MODAL
  const openEditModal = (tailor: Tailor) => {
    if (busyTailorId || saving) return;

    setEditingTailor(tailor);
    setFullName(tailor.full_name);
    setContactNumber(tailor.contact_number ?? '');
    setIsAvailable(tailor.is_available);
    setModalVisible(true);
  };

  // CLOSE MODAL
  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    resetForm();
  };

  // SAVE TAILOR
  const saveTailor = async () => {
    const name = fullName.trim();
    const phone = contactNumber.trim();

    if (name.length < 2) {
      Alert.alert(
        'Invalid Name',
        'Please enter a full name with at least 2 characters.'
      );
      return;
    }

    if (name.length > 80) {
      Alert.alert(
        'Name Too Long',
        'The tailor name must not exceed 80 characters.'
      );
      return;
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '');

      if (digits.length < 7 || digits.length > 15) {
        Alert.alert(
          'Invalid Contact Number',
          'Please enter a valid contact number containing 7 to 15 digits.'
        );
        return;
      }
    }

    try {
      setSaving(true);

      const values = {
        full_name: name,
        contact_number: phone || null,
        is_available: isAvailable,
      };

      const result = editingTailor
        ? await supabase
            .from('tailors')
            .update(values)
            .eq('id', editingTailor.id)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('tailors')
            .insert(values)
            .select('id')
            .single();

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error(
          'No tailor record was updated. Please check your account permissions.'
        );
      }

      const wasEditing = !!editingTailor;

      setModalVisible(false);
      resetForm();

      await loadTailors();

      Alert.alert(
        'Success',
        wasEditing
          ? 'Tailor details updated successfully.'
          : 'Tailor added successfully.'
      );
    } catch (error) {
      console.error('Save tailor error:', error);

      Alert.alert(
        'Unable to Save',
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving the tailor.'
      );
    } finally {
      setSaving(false);
    }
  };

  // TOGGLE AVAILABILITY
  const toggleAvailability = (tailor: Tailor) => {
    if (busyTailorId || saving) return;

    const nextValue = !tailor.is_available;

    Alert.alert(
      nextValue ? 'Set Available' : 'Set Unavailable',
      `Are you sure you want to ${
        nextValue ? 'make' : 'mark'
      } ${tailor.full_name} ${
        nextValue ? 'available' : 'unavailable'
      }?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: nextValue ? 'Set Available' : 'Set Unavailable',
          onPress: async () => {
            if (busyTailorId) return;

            try {
              setBusyTailorId(tailor.id);

              const { error } = await supabase
                .from('tailors')
                .update({
                  is_available: nextValue,
                })
                .eq('id', tailor.id);

              if (error) {
                throw error;
              }

              // Update the list immediately.
              setTailors((previous) =>
                previous.map((item) =>
                  item.id === tailor.id
                    ? { ...item, is_available: nextValue }
                    : item
                )
              );
            } catch (error) {
              console.error(
                'Toggle availability error:',
                error
              );

              Alert.alert(
                'Update Failed',
                error instanceof Error
                  ? error.message
                  : 'Unable to update tailor availability.'
              );
            } finally {
              setBusyTailorId(null);
            }
          },
        },
      ]
    );
  };

  // DELETE TAILOR
  const deleteTailor = (tailor: Tailor) => {
    if (busyTailorId || saving) return;

    Alert.alert(
      'Delete Tailor',
      `Are you sure you want to permanently delete "${tailor.full_name}"? If this tailor has existing order assignments or production history, deletion may be restricted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (busyTailorId) return;

            try {
              setBusyTailorId(tailor.id);

              const { data, error } = await supabase
                .from('tailors')
                .delete()
                .eq('id', tailor.id)
                .select('id')
                .maybeSingle();

              if (error) {
                throw error;
              }

              if (!data) {
                throw new Error(
                  'The tailor could not be deleted. Check your database permissions or whether this tailor still exists.'
                );
              }

              setTailors((previous) =>
                previous.filter((item) => item.id !== tailor.id)
              );

              Alert.alert(
                'Success',
                'Tailor deleted successfully.'
              );
            } catch (error) {
              console.error('Delete tailor error:', error);

              Alert.alert(
                'Cannot Delete Tailor',
                error instanceof Error
                  ? `${error.message}\n\nIf this tailor has existing assignments or production history, mark them unavailable instead.`
                  : 'Unable to delete this tailor. If they have existing assignments, mark them unavailable instead.'
              );
            } finally {
              setBusyTailorId(null);
            }
          },
        },
      ]
    );
  };

  // RENDER TAILOR CARD
  const renderTailor = ({ item }: { item: Tailor }) => {
    const isBusy = busyTailorId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.details}>
            <Text style={styles.name} numberOfLines={2}>
              {item.full_name}
            </Text>

            <Text style={styles.contact}>
              {item.contact_number || 'No contact number'}
            </Text>

            <View style={styles.statusContainer}>
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
                {item.is_available ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>

        {isBusy && (
          <View style={styles.actionLoading}>
            <ActivityIndicator size="small" color="#D96B8A" />
            <Text style={styles.actionLoadingText}>
              Updating tailor...
            </Text>
          </View>
        )}

        <View
          style={[
            styles.actions,
            isSmallScreen && styles.actionsSmall,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.editButton,
              isSmallScreen && styles.smallActionButton,
              isBusy && styles.disabledButton,
            ]}
            onPress={() => openEditModal(item)}
            disabled={!!busyTailorId}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.availabilityButton,
              item.is_available
                ? styles.disableButton
                : styles.enableButton,
              isSmallScreen && styles.smallActionButton,
              isBusy && styles.disabledButton,
            ]}
            onPress={() => toggleAvailability(item)}
            disabled={!!busyTailorId}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {item.is_available ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              isSmallScreen && styles.smallActionButton,
              isBusy && styles.disabledButton,
            ]}
            onPress={() => deleteTailor(item)}
            disabled={!!busyTailorId}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // MAIN UI
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Manage Tailors</Text>

          <Text style={styles.subtitle}>
            Manage your tailoring team
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {tailors.length}
          </Text>

          <Text style={styles.countLabel}>Tailors</Text>
        </View>
      </View>

      {/* SUMMARY */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {tailors.length}
          </Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {tailors.filter((item) => item.is_available).length}
          </Text>
          <Text style={styles.summaryLabel}>Available</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>
            {tailors.filter((item) => !item.is_available).length}
          </Text>
          <Text style={styles.summaryLabel}>Unavailable</Text>
        </View>
      </View>

      {/* ADD BUTTON */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
        disabled={saving || !!busyTailorId}
        activeOpacity={0.85}
      >
        <Text style={styles.addButtonText}>
          + Add Tailor
        </Text>
      </TouchableOpacity>

      {/* TAILOR LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D96B8A" />
          <Text style={styles.loadingText}>
            Loading tailors...
          </Text>
        </View>
      ) : (
        <FlatList
          data={tailors}
          keyExtractor={(item) => item.id}
          renderItem={renderTailor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadTailors}
              tintColor="#D96B8A"
              colors={['#D96B8A']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                No Tailors Yet
              </Text>

              <Text style={styles.emptyText}>
                Add your first tailor to get started.
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
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* MODAL HEADER */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {editingTailor ? 'Edit Tailor' : 'Add Tailor'}
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    {editingTailor
                      ? 'Update tailor information'
                      : 'Register a new member of your tailoring team'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* FULL NAME */}
              <Text style={styles.label}>Full Name *</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter tailor's full name"
                placeholderTextColor="#999999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                maxLength={80}
                editable={!saving}
                returnKeyType="next"
              />

              {/* CONTACT NUMBER */}
              <Text style={styles.label}>Contact Number</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter contact number"
                placeholderTextColor="#999999"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                maxLength={20}
                editable={!saving}
              />

              {/* AVAILABILITY */}
              <Text style={styles.label}>Availability</Text>

              <TouchableOpacity
                style={[
                  styles.availabilitySelector,
                  isAvailable
                    ? styles.availabilitySelectorOn
                    : styles.availabilitySelectorOff,
                ]}
                onPress={() => setIsAvailable((previous) => !previous)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <View style={styles.availabilityInfo}>
                  <Text style={styles.availabilityTitle}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </Text>

                  <Text style={styles.availabilityDescription}>
                    {isAvailable
                      ? 'This tailor can be assigned to orders.'
                      : 'This tailor will not be available for new assignments.'}
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

              {/* SAVE */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveTailor}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTailor ? 'Save Changes' : 'Add Tailor'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* CANCEL */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },

  subtitle: {
    fontSize: 14,
    color: '#777777',
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

  summary: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B84470',
  },

  summaryLabel: {
    fontSize: 11,
    color: '#777777',
    marginTop: 3,
  },

  addButton: {
    backgroundColor: '#D96B8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  list: {
    paddingBottom: 30,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2E7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333333',
  },

  contact: {
    fontSize: 13,
    color: '#777777',
    marginTop: 4,
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
    backgroundColor: '#28A745',
  },

  unavailableDot: {
    backgroundColor: '#999999',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  availableText: {
    color: '#28A745',
  },

  unavailableText: {
    color: '#888888',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E2E7',
    gap: 7,
  },

  actionsSmall: {
    justifyContent: 'space-between',
  },

  editButton: {
    backgroundColor: '#777777',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  availabilityButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disableButton: {
    backgroundColor: '#D99A3D',
  },

  enableButton: {
    backgroundColor: '#28A745',
  },

  deleteButton: {
    backgroundColor: '#D9534F',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallActionButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.5,
  },

  actionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  actionLoadingText: {
    color: '#D96B8A',
    fontSize: 12,
    marginLeft: 7,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#888888',
    fontSize: 14,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#555555',
  },

  emptyText: {
    fontSize: 14,
    color: '#999999',
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

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    maxHeight: '90%',
  },

  modalScrollContent: {
    paddingBottom: 10,
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
    color: '#333333',
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
    lineHeight: 19,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontSize: 27,
    lineHeight: 28,
    color: '#555555',
    fontWeight: '400',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },

  availabilitySelector: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  availabilitySelectorOn: {
    borderColor: '#BFE8C8',
    backgroundColor: '#F4FCF6',
  },

  availabilitySelectorOff: {
    borderColor: '#DDDDDD',
    backgroundColor: '#F8F8F8',
  },

  availabilityInfo: {
    flex: 1,
    paddingRight: 8,
  },

  availabilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },

  availabilityDescription: {
    fontSize: 11,
    color: '#888888',
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
    backgroundColor: '#D96B8A',
  },

  switchTrackOff: {
    backgroundColor: '#CCCCCC',
  },

  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  switchThumbOn: {
    alignSelf: 'flex-end',
  },

  switchThumbOff: {
    alignSelf: 'flex-start',
  },

  saveButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  saveButtonText: {
    color: '#FFFFFF',
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
    color: '#777777',
    fontSize: 15,
    fontWeight: '600',
  },
});
