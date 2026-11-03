import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../../supabase';

export default function PersonalDetailsScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  // Displayed profile information
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  // Temporary edit values
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');

  // =====================================================
  // LOAD PERSONAL DETAILS
  // =====================================================

  const loadPersonalDetails = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          'Error',
          'Unable to retrieve your account information.'
        );

        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select('username, full_name, contact_number, email')
        .eq('id', user.id)
        .single();

      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      setUsername(data.username || '');
      setFullName(data.full_name || '');
      setContactNumber(data.contact_number || '');
      setEmail(data.email || user.email || '');

    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPersonalDetails();
  }, []);

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================

  const openEditModal = () => {
    setEditUsername(username);
    setEditFullName(fullName);
    setEditContactNumber(contactNumber);

    setModalVisible(true);
  };

  // =====================================================
  // CLOSE EDIT MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);

    setEditUsername('');
    setEditFullName('');
    setEditContactNumber('');
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert(
        'Required Field',
        'Please enter your username.'
      );
      return;
    }

    if (!editFullName.trim()) {
      Alert.alert(
        'Required Field',
        'Please enter your full name.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert(
          'Error',
          'Unable to verify your account. Please log in again.'
        );

        setSaving(false);
        return;
      }

      const {
        error,
      } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim(),
          full_name: editFullName.trim(),
          contact_number: editContactNumber.trim(),
        })
        .eq('id', user.id);

      if (error) {
        setSaving(false);

        if (error.code === '23505') {
          Alert.alert(
            'Username Already Taken',
            'This username is already being used. Please choose another username.'
          );
          return;
        }

        Alert.alert(
          'Update Failed',
          error.message
        );

        return;
      }

      // Update displayed information
      setUsername(editUsername.trim());
      setFullName(editFullName.trim());
      setContactNumber(editContactNumber.trim());

      setSaving(false);
      setModalVisible(false);

      Alert.alert(
        'Success',
        'Your personal details have been updated successfully.'
      );

    } catch (error: any) {
      setSaving(false);

      Alert.alert(
        'Error',
        error.message || 'Something went wrong while updating your profile.'
      );
    }
  };

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <View style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#333"
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>
            Personal Details
          </Text>

          <Text style={styles.subtitle}>
            Manage your personal information
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#d96b8a"
          />

          <Text style={styles.loadingText}>
            Loading your details...
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >

          {/* PROFILE INFORMATION */}

          <View style={styles.profileCard}>

            <View style={styles.profileIcon}>
              <Ionicons
                name="person-outline"
                size={32}
                color="#d96b8a"
              />
            </View>

            <Text style={styles.profileName}>
              {fullName || 'Your Name'}
            </Text>

            <Text style={styles.profileEmail}>
              {email || 'No email available'}
            </Text>

            <View style={styles.customerBadge}>
              <Text style={styles.customerBadgeText}>
                PINK BLUSH CUSTOMER
              </Text>
            </View>

          </View>

          {/* PERSONAL INFORMATION */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>
          </View>

          <View style={styles.detailsCard}>

            {/* USERNAME */}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Username
              </Text>

              <Text style={styles.detailValue}>
                {username || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            {/* FULL NAME */}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Full Name
              </Text>

              <Text style={styles.detailValue}>
                {fullName || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            {/* CONTACT NUMBER */}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                Contact Number
              </Text>

              <Text style={styles.detailValue}>
                {contactNumber || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailDivider} />

            {/* EMAIL */}

            <View style={styles.detailItem}>
              <View style={styles.emailLabelContainer}>
                <Text style={styles.detailLabel}>
                  Email Address
                </Text>

                <View style={styles.readOnlyBadge}>
                  <Text style={styles.readOnlyText}>
                    Read-only
                  </Text>
                </View>
              </View>

              <Text style={styles.detailValue}>
                {email || 'Not provided'}
              </Text>
            </View>

          </View>

          {/* EDIT PROFILE BUTTON */}

          <TouchableOpacity
            style={styles.editButton}
            onPress={openEditModal}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#fff"
            />

            <Text style={styles.editButtonText}>
              Edit Profile
            </Text>
          </TouchableOpacity>

          <Text style={styles.noteText}>
            Keep your personal information updated so we can contact you about your orders.
          </Text>

        </ScrollView>
      )}

      {/* =====================================================
          EDIT PROFILE MODAL
          ===================================================== */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.modalContainer}>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* MODAL HEADER */}

              <View style={styles.modalHeader}>

                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    Edit Profile
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Update your personal information
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
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

              {/* USERNAME */}

              <Text style={styles.label}>
                Username
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#999"
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
                editable={!saving}
              />

              {/* FULL NAME */}

              <Text style={styles.label}>
                Full Name
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={editFullName}
                onChangeText={setEditFullName}
                autoCapitalize="words"
                editable={!saving}
              />

              {/* CONTACT NUMBER */}

              <Text style={styles.label}>
                Contact Number
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your contact number"
                placeholderTextColor="#999"
                value={editContactNumber}
                onChangeText={setEditContactNumber}
                keyboardType="phone-pad"
                editable={!saving}
              />

              {/* EMAIL - READ ONLY */}

              <Text style={styles.label}>
                Email Address
              </Text>

              <View style={styles.readOnlyInput}>
                <Text
                  style={styles.readOnlyInputText}
                  numberOfLines={1}
                >
                  {email || 'No email available'}
                </Text>

                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#999"
                />
              </View>

              <Text style={styles.emailNote}>
                Your email address cannot be changed here because it is connected to your login account.
              </Text>

              {/* SAVE BUTTON */}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={21}
                      color="#fff"
                    />

                    <Text style={styles.saveButtonText}>
                      Save Changes
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

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    padding: 20,
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0e2e7',
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  // =====================================================
  // CONTENT
  // =====================================================

  content: {
    paddingBottom: 30,
  },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0e2e7',
    marginBottom: 25,
  },

  profileIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FCE7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  profileName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },

  profileEmail: {
    fontSize: 13,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },

  customerBadge: {
    backgroundColor: '#FCE7F0',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  customerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B84470',
    letterSpacing: 0.5,
  },

  // =====================================================
  // SECTION
  // =====================================================

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },

  // =====================================================
  // DETAILS CARD
  // =====================================================

  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0e2e7',
  },

  detailItem: {
    paddingVertical: 15,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  detailDivider: {
    height: 1,
    backgroundColor: '#f1e8eb',
  },

  emailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  readOnlyBadge: {
    backgroundColor: '#f3f3f3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 6,
  },

  readOnlyText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#888',
  },

  // =====================================================
  // EDIT BUTTON
  // =====================================================

  editButton: {
    backgroundColor: '#d96b8a',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },

  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  noteText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 13,
    paddingHorizontal: 10,
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

  // =====================================================
  // INPUTS
  // =====================================================

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

  readOnlyInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#f7f7f7',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  readOnlyInputText: {
    flex: 1,
    fontSize: 15,
    color: '#888',
    marginRight: 10,
  },

  emailNote: {
    fontSize: 11,
    color: '#999',
    lineHeight: 16,
    marginBottom: 20,
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