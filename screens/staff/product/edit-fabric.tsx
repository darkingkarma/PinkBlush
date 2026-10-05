import {
  useState,
} from 'react';

import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  decode,
} from 'base64-arraybuffer';

import {
  supabase,
} from '../../../supabase';

export default function EditFabricScreen({
  route,
  navigation,
}: any) {
  const {
    fabric,
  } = route.params;

  const [name, setName] =
    useState(fabric.name);

  const [description, setDescription] =
    useState(
      fabric.description || ''
    );

  const [priceAddition, setPriceAddition] =
    useState(
      String(
        fabric.price_addition || 0
      )
    );

  const [available, setAvailable] =
    useState(fabric.available);

  const [image, setImage] =
    useState<string | null>(
      fabric.image_url || null
    );

  const [imageBase64, setImageBase64] =
    useState<string | null>(null);

  const [imageType, setImageType] =
    useState('image/jpeg');

  const [loading, setLoading] =
    useState(false);

  const pickImage = async () => {
    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos.'
      );
      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled) {
      const selectedImage =
        result.assets[0];

      setImage(
        selectedImage.uri
      );

      setImageBase64(
        selectedImage.base64 || null
      );

      setImageType(
        selectedImage.mimeType ||
          'image/jpeg'
      );
    }
  };

  const uploadImage = async () => {
    if (!imageBase64) {
      return null;
    }

    let extension = 'jpg';

    if (
      imageType === 'image/png'
    ) {
      extension = 'png';
    } else if (
      imageType === 'image/webp'
    ) {
      extension = 'webp';
    } else if (
      imageType === 'image/gif'
    ) {
      extension = 'gif';
    }

    const fileName =
      `fabric-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const arrayBuffer =
      decode(imageBase64);

    const { error } =
      await supabase.storage
        .from('garments')
        .upload(
          fileName,
          arrayBuffer,
          {
            contentType: imageType,
            upsert: false,
          }
        );

    if (error) {
      throw error;
    }

    const { data } =
      supabase.storage
        .from('garments')
        .getPublicUrl(
          fileName
        );

    return data.publicUrl;
  };

  const deleteOldImage = async () => {
    if (!fabric.image_url) {
      return;
    }

    const imagePath =
      fabric.image_url
        .split('/garments/')[1];

    if (!imagePath) {
      return;
    }

    const { error } =
      await supabase.storage
        .from('garments')
        .remove([
          imagePath,
        ]);

    if (error) {
      throw error;
    }
  };

  const updateFabric = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Required',
        'Please enter a fabric name.'
      );
      return;
    }

    const priceNumber =
      Number(
        priceAddition
      );

    if (
      priceAddition.trim() &&
      (
        Number.isNaN(priceNumber) ||
        priceNumber < 0
      )
    ) {
      Alert.alert(
        'Invalid Price',
        'Please enter a valid price.'
      );
      return;
    }

    try {
      setLoading(true);

      let imageUrl =
        fabric.image_url || null;

      if (imageBase64) {
        imageUrl =
          await uploadImage();

        await deleteOldImage();
      }

      const { error } =
        await supabase
          .from('fabrics')
          .update({
            name:
              name.trim(),

            description:
              description.trim() ||
              null,

            image_url:
              imageUrl,

            price_addition:
              priceNumber || 0,

            available:
              available,
          })
          .eq(
            'id',
            fabric.id
          );

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Fabric updated successfully.'
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message ||
          'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Edit Fabric
      </Text>

      <Text style={styles.label}>
        Fabric Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter fabric name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Description
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.descriptionInput,
        ]}
        placeholder="Enter description"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>
        Price Addition
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter additional price"
        value={priceAddition}
        onChangeText={setPriceAddition}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>
        Availability
      </Text>

      <View style={styles.availabilityRow}>
        <TouchableOpacity
          style={[
            styles.availabilityButton,
            available &&
              styles.selectedAvailability,
          ]}
          onPress={() =>
            setAvailable(true)
          }
        >
          <Text
            style={[
              styles.availabilityText,
              available &&
                styles.selectedAvailabilityText,
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.availabilityButton,
            !available &&
              styles.selectedAvailability,
          ]}
          onPress={() =>
            setAvailable(false)
          }
        >
          <Text
            style={[
              styles.availabilityText,
              !available &&
                styles.selectedAvailabilityText,
            ]}
          >
            Unavailable
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>
        Fabric Image
      </Text>

      {image && (
        <Image
          source={{
            uri: image,
          }}
          style={styles.image}
        />
      )}

      <TouchableOpacity
        style={styles.imageButton}
        onPress={pickImage}
      >
        <Text style={styles.imageButtonText}>
          {image
            ? 'Change Image'
            : 'Choose Image'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.updateButton}
        onPress={updateFabric}
        disabled={loading}
      >
        <Text style={styles.updateButtonText}>
          {loading
            ? 'Updating...'
            : 'Update Fabric'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 15,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: '#fff',
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  availabilityRow: {
    flexDirection: 'row',
    gap: 10,
  },

  availabilityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },

  selectedAvailability: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff5f8',
  },

  availabilityText: {
    color: '#555',
    fontWeight: '600',
  },

  selectedAvailabilityText: {
    color: '#d96b8a',
  },

  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginBottom: 10,
  },

  imageButton: {
    borderWidth: 1,
    borderColor: '#d96b8a',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 5,
  },

  imageButtonText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  updateButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },

  updateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

