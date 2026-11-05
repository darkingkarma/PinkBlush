import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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

import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';

import { RootStackParamList } from '../../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EditDesign'
>;

type Design = {
  id: string;
  garment_part_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1000;

export default function EditDesignScreen({
  route,
  navigation,
}: Props) {
  const { design } = route.params;
  const { width } = useWindowDimensions();

  const [name, setName] = useState(design.name);

  const [description, setDescription] = useState(
    design.description || ''
  );

  const [image, setImage] = useState<string | null>(
    design.image_url
  );

  const [imageBase64, setImageBase64] = useState<string | null>(
    null
  );

  const [imageType, setImageType] = useState('image/jpeg');

  const [removeExistingImage, setRemoveExistingImage] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const isSmallScreen = width < 380;

  // -----------------------------
  // PICK DESIGN IMAGE
  // -----------------------------
  const pickImage = async () => {
    if (loading || pickingImage) return;

    try {
      setPickingImage(true);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to select a design image.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

      if (result.canceled) return;

      const selectedImage = result.assets[0];

      if (!selectedImage) return;

      const selectedType =
        selectedImage.mimeType || 'image/jpeg';

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!allowedTypes.includes(selectedType)) {
        Alert.alert(
          'Unsupported Image',
          'Please select a JPG, PNG, or WebP image.'
        );
        return;
      }

      if (
        selectedImage.fileSize &&
        selectedImage.fileSize > MAX_IMAGE_SIZE
      ) {
        Alert.alert(
          'Image Too Large',
          'Please select an image that is 5 MB or smaller.'
        );
        return;
      }

      if (!selectedImage.base64) {
        Alert.alert(
          'Image Error',
          'Unable to process this image. Please select another one.'
        );
        return;
      }

      setImage(selectedImage.uri);
      setImageBase64(selectedImage.base64);
      setImageType(selectedType);

      // A newly selected image replaces the previous one.
      setRemoveExistingImage(false);
    } catch (error: any) {
      Alert.alert(
        'Image Error',
        error.message || 'Unable to select the image.'
      );
    } finally {
      setPickingImage(false);
    }
  };

  // -----------------------------
  // REMOVE DESIGN IMAGE
  // -----------------------------
  const removeImage = () => {
    if (loading) return;

    setImage(null);
    setImageBase64(null);
    setImageType('image/jpeg');

    // Delete the existing image from storage
    // only after the database update succeeds.
    setRemoveExistingImage(true);
  };

  // -----------------------------
  // UPLOAD NEW IMAGE
  // -----------------------------
  const uploadImage = async (): Promise<{
    url: string;
    path: string;
  }> => {
    if (!imageBase64) {
      throw new Error('No image selected.');
    }

    let extension = 'jpg';

    if (imageType === 'image/png') {
      extension = 'png';
    } else if (imageType === 'image/webp') {
      extension = 'webp';
    }

    const fileName =
      `design-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const arrayBuffer = decode(imageBase64);

    const { error } = await supabase.storage
      .from('garments')
      .upload(fileName, arrayBuffer, {
        contentType: imageType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    return {
      url: data.publicUrl,
      path: fileName,
    };
  };

  // -----------------------------
  // GET OLD IMAGE STORAGE PATH
  // -----------------------------
  const getOldImagePath = () => {
    if (!design.image_url) return null;

    const marker = '/garments/';
    const index = design.image_url.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(
      design.image_url.substring(index + marker.length)
    );
  };

  // -----------------------------
  // DELETE OLD IMAGE
  // -----------------------------
  const deleteOldImage = async () => {
    const imagePath = getOldImagePath();

    if (!imagePath) return;

    const { error } = await supabase.storage
      .from('garments')
      .remove([imagePath]);

    if (error) {
      // The database is already updated, so this is
      // a cleanup warning rather than a failed update.
      console.warn('Old design image cleanup failed:', error.message);
    }
  };

  // -----------------------------
  // UPDATE DESIGN
  // -----------------------------
  const updateDesign = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      Alert.alert(
        'Required',
        'Please enter a design name.'
      );
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert(
        'Invalid Name',
        'The design name must contain at least 2 characters.'
      );
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      Alert.alert(
        'Name Too Long',
        `The design name cannot exceed ${MAX_NAME_LENGTH} characters.`
      );
      return;
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      Alert.alert(
        'Description Too Long',
        `The description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`
      );
      return;
    }

    if (loading || pickingImage) return;

    let uploadedImagePath: string | null = null;
    let databaseUpdated = false;

    try {
      setLoading(true);

      let imageUrl: string | null = design.image_url;

      // Upload new image if selected.
      if (imageBase64) {
        const uploadedImage = await uploadImage();

        imageUrl = uploadedImage.url;
        uploadedImagePath = uploadedImage.path;
      }

      // Remove image URL from database if requested.
      if (removeExistingImage) {
        imageUrl = null;
      }

      // Update database first.
      const { error } = await supabase
        .from('designs')
        .update({
          name: trimmedName,
          description: trimmedDescription || null,
          image_url: imageUrl,
        })
        .eq('id', design.id);

      if (error) {
        throw error;
      }

      databaseUpdated = true;

      // Only delete the old image after the database
      // successfully points to the new image or null.
      if (
        (imageBase64 || removeExistingImage) &&
        design.image_url
      ) {
        await deleteOldImage();
      }

      Alert.alert(
        'Success',
        'Design updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      // If the database update failed, remove the newly
      // uploaded image to avoid leaving an unused file.
      if (uploadedImagePath && !databaseUpdated) {
        const { error: cleanupError } = await supabase.storage
          .from('garments')
          .remove([uploadedImagePath]);

        if (cleanupError) {
          console.warn(
            'New image cleanup failed:',
            cleanupError.message
          );
        }
      }

      Alert.alert(
        'Error',
        error.message || 'Something went wrong while updating the design.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isSmallScreen ? 14 : 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Edit Design
            </Text>

            <Text style={styles.subtitle}>
              Update the design details and image.
            </Text>
          </View>

          {/* FORM CARD */}
          <View style={styles.card}>
            {/* DESIGN NAME */}
            <Text style={styles.label}>
              Design Name <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter design name"
              placeholderTextColor="#aaa"
              value={name}
              onChangeText={(value) =>
                setName(value.slice(0, MAX_NAME_LENGTH))
              }
              maxLength={MAX_NAME_LENGTH}
              editable={!loading}
            />

            <Text style={styles.helperText}>
              {name.length}/{MAX_NAME_LENGTH} characters
            </Text>

            {/* DESCRIPTION */}
            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Describe the design..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={(value) =>
                setDescription(
                  value.slice(0, MAX_DESCRIPTION_LENGTH)
                )
              }
              multiline
              textAlignVertical="top"
              maxLength={MAX_DESCRIPTION_LENGTH}
              editable={!loading}
            />

            <Text style={styles.helperText}>
              {description.length}/{MAX_DESCRIPTION_LENGTH} characters
            </Text>

            {/* DESIGN IMAGE */}
            <Text style={styles.label}>
              Design Image
            </Text>

            <Text style={styles.imageHint}>
              Upload a clear image of the design. JPG, PNG, or WebP, up to 5 MB.
            </Text>

            {image ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: image }}
                  style={styles.image}
                  resizeMode="cover"
                />

                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={pickImage}
                    disabled={loading || pickingImage}
                  >
                    <Text style={styles.changeImageText}>
                      Change Image
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}
                    disabled={loading}
                  >
                    <Text style={styles.removeImageText}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={pickImage}
                disabled={loading || pickingImage}
                activeOpacity={0.7}
              >
                {pickingImage ? (
                  <ActivityIndicator
                    size="large"
                    color="#d96b8a"
                  />
                ) : (
                  <>
                    <Text style={styles.imageIcon}>
                      +
                    </Text>

                    <Text style={styles.placeholderTitle}>
                      Choose Design Image
                    </Text>

                    <Text style={styles.placeholderSubtitle}>
                      Tap here to upload an image
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* UPDATE BUTTON */}
            <TouchableOpacity
              style={[
                styles.updateButton,
                loading && styles.disabledButton,
              ]}
              onPress={updateDesign}
              disabled={loading || pickingImage}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator
                    color="#fff"
                    size="small"
                  />

                  <Text style={styles.updateButtonText}>
                    Updating Design...
                  </Text>
                </View>
              ) : (
                <Text style={styles.updateButtonText}>
                  Update Design
                </Text>
              )}
            </TouchableOpacity>

            {/* CANCEL BUTTON */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff8fa',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 40,
  },

  formContainer: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#333',
  },

  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    lineHeight: 19,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f3e3e9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 17,
  },

  required: {
    color: '#d96b8a',
  },

  input: {
    borderWidth: 1,
    borderColor: '#e5dce0',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },

  descriptionInput: {
    height: 115,
    paddingTop: 12,
  },

  helperText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },

  imageHint: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    marginBottom: 10,
  },

  imagePlaceholder: {
    height: 210,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e5a5b8',
    borderRadius: 12,
    backgroundColor: '#fff8fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },

  imageIcon: {
    fontSize: 42,
    color: '#d96b8a',
    fontWeight: '300',
    marginBottom: 8,
  },

  placeholderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d96b8a',
  },

  placeholderSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },

  imagePreviewContainer: {
    width: '100%',
  },

  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },

  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  changeImageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },

  changeImageText: {
    color: '#d96b8a',
    fontSize: 13,
    fontWeight: '600',
  },

  removeImageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
  },

  removeImageText: {
    color: '#777',
    fontSize: 13,
    fontWeight: '600',
  },

  updateButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 25,
  },

  disabledButton: {
    opacity: 0.65,
  },

  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  cancelButton: {
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 5,
  },

  cancelButtonText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
});