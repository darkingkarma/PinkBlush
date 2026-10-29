
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../supabase';

export default function CustomOrderScreen() {
  const navigation = useNavigation<any>();

  const [description, setDescription] = useState('');
  const [preferredColor, setPreferredColor] = useState('');
  const [fabricPreference, setFabricPreference] = useState('');
  const [instructions, setInstructions] = useState('');

  const [neededByDate, setNeededByDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [imageExtension, setImageExtension] = useState('jpg');

  const [loading, setLoading] = useState(false);

  const formatDateForStorage = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date) =>
    date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow photo library access to select a reference image.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert(
          'Image error',
          'Unable to read the selected image. Please choose another image.',
        );
        return;
      }

      const supportedTypes: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };

      let detectedType = asset.mimeType?.toLowerCase();

      if (!detectedType || !supportedTypes[detectedType]) {
        const uriExtension = asset.uri
          .split('.')
          .pop()
          ?.split('?')[0]
          .toLowerCase();

        if (uriExtension === 'png') {
          detectedType = 'image/png';
        } else if (uriExtension === 'webp') {
          detectedType = 'image/webp';
        } else if (
          uriExtension === 'jpg' ||
          uriExtension === 'jpeg'
        ) {
          detectedType = 'image/jpeg';
        }
      }

      if (!detectedType || !supportedTypes[detectedType]) {
        Alert.alert(
          'Unsupported image',
          'Please choose a JPG, PNG, or WebP image.',
        );
        return;
      }

      setImageUri(asset.uri);
      setImageBase64(asset.base64);
      setImageType(
        detectedType === 'image/jpg' ? 'image/jpeg' : detectedType,
      );
      setImageExtension(supportedTypes[detectedType]);
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Unable to open your photo library.');
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageBase64(null);
    setImageType('image/jpeg');
    setImageExtension('jpg');
  };

  // Save the selected date, then close the Android picker.
  const handleDateValueChange = (
    event: any,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      setNeededByDate(selectedDate);
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

  const clearNeededByDate = () => {
    setNeededByDate(null);
    setShowDatePicker(false);
  };

  const submitCustomOrder = async () => {
    const cleanDescription = description.trim();
    const cleanColor = preferredColor.trim();
    const cleanFabric = fabricPreference.trim();
    const cleanInstructions = instructions.trim();

    if (!cleanDescription) {
      Alert.alert(
        'Missing description',
        'Please describe the garment you want.',
      );
      return;
    }

    if (cleanDescription.length < 10) {
      Alert.alert(
        'Description too short',
        'Please describe your requested garment in at least 10 characters.',
      );
      return;
    }

    if (
      neededByDate &&
      formatDateForStorage(neededByDate) <
        formatDateForStorage(new Date())
    ) {
      Alert.alert(
        'Invalid date',
        'The needed-by date cannot be in the past.',
      );
      return;
    }

    let imagePath: string | null = null;

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Sign in required',
          'Please log in before submitting a custom order.',
        );
        return;
      }

      if (imageBase64) {
        const imageBytes = decode(imageBase64);

        if (imageBytes.byteLength === 0) {
          throw new Error('The selected image file is empty.');
        }

        if (imageBytes.byteLength > 5 * 1024 * 1024) {
          throw new Error(
            'The image must be 5 MB or smaller. Please choose a smaller image.',
          );
        }

        const fileName = `${user.id}/${Date.now()}.${imageExtension}`;

        const {
          data: uploadData,
          error: uploadError,
        } = await supabase.storage
          .from('custom-order-images')
          .upload(fileName, imageBytes, {
            contentType: imageType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        imagePath = uploadData.path;

        console.log('Custom reference image uploaded:', {
          path: imagePath,
          type: imageType,
          size: imageBytes.byteLength,
        });
      }

      const { error: insertError } = await supabase
        .from('custom_orders')
        .insert({
          user_id: user.id,
          reference_image_url: imagePath,
          garment_description: cleanDescription,
          preferred_color: cleanColor || null,
          fabric_preference: cleanFabric || null,
          needed_by_date: neededByDate
            ? formatDateForStorage(neededByDate)
            : null,
          special_instructions: cleanInstructions || null,
          status: 'submitted',
        });

      if (insertError) {
        if (imagePath) {
          const { error: cleanupError } = await supabase.storage
            .from('custom-order-images')
            .remove([imagePath]);

          if (cleanupError) {
            console.warn(
              'Image cleanup failed:',
              cleanupError.message,
            );
          }
        }

        throw insertError;
      }

      Alert.alert(
        'Request submitted!',
        'Your custom garment request has been submitted. Please wait for staff to review your request and provide a quotation.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      console.error('Custom order submission error:', error);

      Alert.alert(
        'Submission failed',
        error?.message ||
          'Unable to submit your request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Request a Custom Garment</Text>

      <Text style={styles.subtitle}>
        Have a design in mind? Tell us what you need, and our staff
        will review your request and prepare a quotation.
      </Text>

      <Text style={styles.label}>Reference Image (Optional)</Text>

      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.referenceImage}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.removeButton}
            onPress={removeImage}
            disabled={loading}
          >
            <Text style={styles.removeButtonText}>Remove Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={pickImage}
          disabled={loading}
        >
          <Text style={styles.uploadIcon}>＋</Text>
          <Text style={styles.uploadTitle}>Upload Reference Image</Text>
          <Text style={styles.uploadHint}>
            JPG, PNG, or WebP · Maximum 5 MB
          </Text>
        </TouchableOpacity>
      )}

      {imageUri && (
        <TouchableOpacity
          style={styles.changeImageButton}
          onPress={pickImage}
          disabled={loading}
        >
          <Text style={styles.changeImageText}>Change Image</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Garment Description *</Text>

      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Example: A pink formal dress with puff sleeves, a fitted waist, and a knee-length skirt."
        placeholderTextColor="#999"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        maxLength={1500}
        editable={!loading}
      />

      <Text style={styles.characterCount}>
        {description.length}/1500 characters
      </Text>

      <Text style={styles.label}>Preferred Color (Optional)</Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Dusty pink, black, navy blue"
        placeholderTextColor="#999"
        value={preferredColor}
        onChangeText={setPreferredColor}
        maxLength={100}
        editable={!loading}
      />

      <Text style={styles.label}>
        Fabric / Material Preference (Optional)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Satin, cotton, linen, or any suitable fabric"
        placeholderTextColor="#999"
        value={fabricPreference}
        onChangeText={setFabricPreference}
        maxLength={200}
        editable={!loading}
      />

      <Text style={styles.label}>Needed-By Date (Optional)</Text>

      <Text style={styles.fieldHint}>
        When do you hope to receive your garment? This is a
        preferred date, not a confirmed completion date.
      </Text>

      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
        disabled={loading}
      >
        <Text
          style={[
            styles.dateButtonText,
            !neededByDate && styles.placeholderText,
          ]}
        >
          {neededByDate
            ? formatDateForDisplay(neededByDate)
            : 'Select your preferred date'}
        </Text>

        <Text style={styles.calendarIcon}>▦</Text>
      </TouchableOpacity>

      {neededByDate && (
        <TouchableOpacity
          style={styles.clearDateButton}
          onPress={clearNeededByDate}
          disabled={loading}
        >
          <Text style={styles.clearDateText}>Remove Date</Text>
        </TouchableOpacity>
      )}

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={neededByDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onValueChange={handleDateValueChange}
            onDismiss={handleDateDismiss}
          />

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneDateButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.doneDateText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.label}>
        Special Instructions (Optional)
      </Text>

      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Include extra design details, preferred fit, sleeve style, or other requests..."
        placeholderTextColor="#999"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        textAlignVertical="top"
        maxLength={1500}
        editable={!loading}
      />

      <Text style={styles.characterCount}>
        {instructions.length}/1500 characters
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>What happens next?</Text>
        <Text style={styles.noticeText}>
          1. Submit your garment request.
          {'\n'}2. Staff review your design and preferences.
          {'\n'}3. Staff prepare a quotation and estimated completion date.
          {'\n'}4. Review the quotation before proceeding.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.disabledButton,
        ]}
        onPress={submitCustomOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>
            Submit Custom Request
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footer}>
        Submitting a request does not confirm an order or set a final price.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B84470',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    lineHeight: 21,
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 12,
  },
  fieldHint: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    marginBottom: 10,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#E7A3BA',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
  },
  uploadIcon: {
    fontSize: 36,
    color: '#D96B8A',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B84470',
  },
  uploadHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
  },
  referenceImage: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: '#F3E4EA',
  },
  removeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  removeButtonText: {
    color: '#C43D61',
    fontWeight: '600',
  },
  changeImageButton: {
    alignSelf: 'center',
    padding: 10,
  },
  changeImageText: {
    color: '#B84470',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#999',
    marginTop: 5,
  },
  dateButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E4D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  calendarIcon: {
    fontSize: 22,
    color: '#B84470',
    marginLeft: 10,
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D5DF',
  },
  doneDateButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneDateText: {
    color: '#B84470',
    fontWeight: '700',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  clearDateText: {
    color: '#C43D61',
    fontSize: 13,
    fontWeight: '600',
  },
  notice: {
    backgroundColor: '#FCEAF0',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B84470',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#684754',
    lineHeight: 23,
  },
  submitButton: {
    backgroundColor: '#D96B8A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
  },
});
