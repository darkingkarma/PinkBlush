
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

  // Temporary editing information
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Error', 'Unable to get your account information.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, contact_number, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Load profile error:', error);
        Alert.alert('Error', 'Unable to load your personal details.');
        return;
      }

      setUsername(data.username || '');
      setFullName(data.full_name || '');
      setContactNumber(data.contact_number || '');
      setEmail(data.email || user.email || '');
    } catch (error) {
      console.error('Profile error:', error);
      Alert.alert('Error', 'Something went wrong while loading your profile.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setEditUsername(username);
    setEditFullName(fullName);
    setEditContactNumber(contactNumber);
    setModalVisible(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const saveChanges = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Missing Information', 'Please enter your username.');
      return;
    }

    if (!editFullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name.');
      return;
    }

    if (!editContactNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your contact number.');
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Error', 'Please log in again.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim(),
          full_name: editFullName.trim(),
          contact_number: editContactNumber.trim(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Save profile error:', error);

        if (error.code === '23505') {
          Alert.alert(
            'Username Already Taken',
            'Please choose another username.',
          );
        } else {
          Alert.alert('Update Failed', error.message);
        }

        return;
      }

      // Update displayed information
      setUsername(editUsername.trim());
      setFullName(editFullName.trim());
      setContactNumber(editContactNumber.trim());

      setModalVisible(false);

      Alert.alert(
        'Changes Saved',
        'Your personal details have been updated successfully.',
      );
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Something went wrong while saving your details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D96B8A" />
        <Text style={styles.loadingText}>Loading your details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrapper}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Personal Details</Text>
            <Text style={styles.headerSubtitle}>
              View and manage your account information.
            </Text>
          </View>

          {/* PERSONAL INFORMATION CARD */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <Text style={styles.sectionDescription}>
              Your registered personal information.
            </Text>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.detailValue}>
                {username || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.detailValue}>
                {fullName || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Contact Number</Text>
              <Text style={styles.detailValue}>
                {contactNumber || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.detailValue}>
                {email || 'Not provided'}
              </Text>
              <Text style={styles.helperText}>
                Your registered email address is used for signing in.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>Pink Blush Fashion</Text>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <View style={styles.modalCard}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>
                  Update your personal information.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeEditModal}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* SCROLLABLE FORM */}
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Enter your username"
                  placeholderTextColor="#AAAAAA"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  editable={!saving}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#AAAAAA"
                  autoCapitalize="words"
                  maxLength={100}
                  editable={!saving}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={editContactNumber}
                  onChangeText={setEditContactNumber}
                  placeholder="Enter your contact number"
                  placeholderTextColor="#AAAAAA"
                  keyboardType="phone-pad"
                  maxLength={20}
                  editable={!saving}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={email}
                  editable={false}
                  placeholder="Email address"
                />
                <Text style={styles.helperText}>
                  Your email address cannot be changed here.
                </Text>
              </View>

              {/* SAVE BUTTON */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveChanges}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              {/* CANCEL BUTTON */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditModal}
                disabled={saving}
                activeOpacity={0.7}
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
    backgroundColor: '#FFF8FA',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#777777',
    fontSize: 14,
  },

  header: {
    marginBottom: 24,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 7,
    lineHeight: 21,
  },

  detailsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },

  sectionDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
  },

  detailGroup: {
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E9ED',
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999999',
    marginBottom: 8,
  },

  detailValue: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
    lineHeight: 22,
  },

  helperText: {
    fontSize: 11,
    color: '#999999',
    marginTop: 7,
    lineHeight: 16,
  },

  editButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: '#D96B8A',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  footerText: {
    textAlign: 'center',
    color: '#C18A9D',
    fontSize: 12,
    marginTop: 25,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    elevation: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#333333',
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 5,
    lineHeight: 19,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCE8EF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeText: {
    fontSize: 25,
    color: '#B84470',
    lineHeight: 28,
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  inputGroup: {
    marginBottom: 18,
  },

  input: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#F0DCE3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },

  readOnlyInput: {
    backgroundColor: '#F7F4F5',
    color: '#888888',
  },

  saveButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: '#D96B8A',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

  cancelButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  cancelButtonText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
});
