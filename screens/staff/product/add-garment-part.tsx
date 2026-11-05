
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'AddGarmentPart'
>;

export default function AddGarmentPartScreen({
  route,
  navigation,
}: Props) {
  const { garmentId } = route.params;
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 380;
  const isWideScreen = width >= 768;

  const [name, setName] = useState('');
  const [gender, setGender] = useState('Unisex');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const addPart = async () => {
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedPrice = price.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      Alert.alert('Missing Information', 'Please enter a garment part name.');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Invalid Name', 'The part name must contain at least 2 characters.');
      return;
    }

    if (!trimmedPrice) {
      Alert.alert('Missing Information', 'Please enter a price.');
      return;
    }

    const priceNumber = Number(trimmedPrice);

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      Alert.alert(
        'Invalid Price',
        'Please enter a valid price that is zero or greater.',
      );
      return;
    }

    if (!Number.isFinite(Number(priceNumber.toFixed(2)))) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    if (trimmedDescription.length > 1000) {
      Alert.alert(
        'Description Too Long',
        'The description must not exceed 1,000 characters.',
      );
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('garment_parts')
        .insert({
          garment_id: garmentId,
          name: trimmedName,
          gender,
          price: priceNumber,
          description: trimmedDescription || null,
          available,
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Garment part added successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Unable to Add Garment Part',
        error.message || 'Something went wrong while saving.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isWideScreen && styles.wideContent,
        ]}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>GARMENT MANAGEMENT</Text>
          <Text style={styles.title}>Add Garment Part</Text>
          <Text style={styles.subtitle}>
            Enter the details of the garment part you want to add.
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* PART NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Part Name <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: Upper, Pants, Sleeves"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!saving}
            />

            <Text style={styles.helperText}>
              Enter the name of this garment part.
            </Text>
          </View>

          {/* GENDER */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>

            <View style={styles.optionContainer}>
              {['Male', 'Female', 'Unisex'].map((item) => {
                const selected = gender === item;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionButton,
                      selected && styles.selectedGender,
                    ]}
                    onPress={() => setGender(item)}
                    disabled={saving}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.selectedGenderText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PRICE */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Price <Text style={styles.required}>*</Text>
            </Text>

            <View style={styles.priceContainer}>
              <View style={styles.currencyContainer}>
                <Text style={styles.currencyText}>₱</Text>
              </View>

              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="#aaa"
                value={price}
                onChangeText={(value) => {
                  // Allow only numbers and one decimal point.
                  const cleaned = value.replace(/[^0-9.]/g, '');
                  const decimalParts = cleaned.split('.');

                  if (decimalParts.length > 2) return;

                  if (
                    decimalParts[1] &&
                    decimalParts[1].length > 2
                  ) {
                    return;
                  }

                  setPrice(cleaned);
                }}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>

            <Text style={styles.helperText}>
              Enter the base price for this garment part.
            </Text>
          </View>

          {/* DESCRIPTION */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.counter}>
                {description.length}/1000
              </Text>
            </View>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Describe this garment part..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              editable={!saving}
            />

            <Text style={styles.helperText}>
              Optional. Provide additional details about the garment part.
            </Text>
          </View>

          {/* AVAILABILITY */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Availability</Text>

            <View style={styles.availabilityContainer}>
              <TouchableOpacity
                style={[
                  styles.availabilityButton,
                  available && styles.selectedAvailable,
                ]}
                onPress={() => setAvailable(true)}
                disabled={saving}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.availabilityText,
                    available && styles.selectedAvailabilityText,
                  ]}
                >
                  Available
                </Text>

                <Text
                  style={[
                    styles.availabilityDescription,
                    available && styles.selectedAvailabilityText,
                  ]}
                >
                  Can be ordered
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.availabilityButton,
                  !available && styles.selectedUnavailable,
                ]}
                onPress={() => setAvailable(false)}
                disabled={saving}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.availabilityText,
                    !available && styles.selectedUnavailableText,
                  ]}
                >
                  Not Available
                </Text>

                <Text
                  style={[
                    styles.availabilityDescription,
                    !available && styles.selectedUnavailableText,
                  ]}
                >
                  Cannot be ordered
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            style={[
              styles.addButton,
              saving && styles.disabledButton,
            ]}
            onPress={addPart}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.addButtonText}>Saving...</Text>
              </>
            ) : (
              <Text style={styles.addButtonText}>
                Add Garment Part
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Fields marked with * are required.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  wideContent: {
    width: '100%',
    maxWidth: 750,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 25,
  },

  heading: {
    marginBottom: 20,
  },

  eyebrow: {
    color: '#b86b83',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 6,
  },

  title: {
    color: '#30242a',
    fontSize: 25,
    fontWeight: '800',
  },

  subtitle: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f1dce3',
    padding: 16,
  },

  fieldGroup: {
    marginBottom: 20,
  },

  label: {
    color: '#44343b',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 9,
  },

  required: {
    color: '#d9534f',
  },

  input: {
    borderWidth: 1,
    borderColor: '#eadde2',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 14,
    color: '#30242a',
  },

  helperText: {
    color: '#999',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },

  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionButton: {
    flex: 1,
    minWidth: 75,
    borderWidth: 1,
    borderColor: '#eadde2',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },

  selectedGender: {
    backgroundColor: '#fff0f5',
    borderColor: '#d96b8a',
  },

  optionText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },

  selectedGenderText: {
    color: '#d96b8a',
    fontWeight: '800',
  },

  priceContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#eadde2',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },

  currencyContainer: {
    backgroundColor: '#fff0f5',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRightWidth: 1,
    borderRightColor: '#eadde2',
  },

  currencyText: {
    color: '#d96b8a',
    fontSize: 16,
    fontWeight: '800',
  },

  priceInput: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#30242a',
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  counter: {
    color: '#aaa',
    fontSize: 10,
    marginBottom: 9,
  },

  descriptionInput: {
    height: 110,
    paddingTop: 12,
  },

  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  availabilityButton: {
    flex: 1,
    minWidth: 125,
    borderWidth: 1,
    borderColor: '#eadde2',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },

  selectedAvailable: {
    backgroundColor: '#eaf7ef',
    borderColor: '#4caf50',
  },

  selectedUnavailable: {
    backgroundColor: '#fff0ef',
    borderColor: '#d9534f',
  },

  availabilityText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  availabilityDescription: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },

  selectedAvailabilityText: {
    color: '#24834c',
  },

  selectedUnavailableText: {
    color: '#d9534f',
  },

  addButton: {
    backgroundColor: '#d96b8a',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 3,
  },

  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.65,
  },

  footerNote: {
    color: '#aaa',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 13,
  },
});
