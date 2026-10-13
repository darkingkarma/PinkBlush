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
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  decode,
} from 'base64-arraybuffer';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  supabase,
} from '../../../supabase';

import {
  RootStackParamList,
} from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'AddDesign'
>;

export default function AddDesignScreen({
  navigation,
  route,
}: Props) {
  const {
    garmentPartId,
  } = route.params;

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [image, setImage] =
    useState<string | null>(null);

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
      `design-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const arrayBuffer =
      decode(imageBase64);

    const {
      error,
    } = await supabase.storage
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

    const {
      data,
    } = supabase.storage
      .from('garments')
      .getPublicUrl(
        fileName
      );

    return data.publicUrl;
  };

  const addDesign = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Required',
        'Please enter a design name.'
      );
      return;
    }

    try {
      setLoading(true);

      let imageUrl = null;

      if (imageBase64) {
        imageUrl =
          await uploadImage();
      }

      const {
        error,
      } = await supabase
        .from('designs')
        .insert({
          garment_part_id:
            garmentPartId,
          name: name.trim(),
          description:
            description.trim() ||
            null,
          image_url:
            imageUrl,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Design added successfully.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
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
        Add Design
      </Text>

      <Text style={styles.label}>
        Design Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter design name"
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
        Design Image
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
        style={styles.addButton}
        onPress={addDesign}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>
          {loading
            ? 'Adding...'
            : 'Add Design'}
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

  addButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
