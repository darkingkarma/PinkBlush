import {
  useEffect,
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

type GarmentPart = {
  id: string;
  garment_id: string;
  name: string;
  gender: string;
};

type Garment = {
  id: string;
  name: string;
};

export default function AddDesignScreen({
  navigation,
}: any) {
  const [garmentParts, setGarmentParts] =
    useState<GarmentPart[]>([]);

  const [garments, setGarments] =
    useState<Garment[]>([]);

  const [garmentPartId, setGarmentPartId] =
    useState('');

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

  useEffect(() => {
    getGarmentParts();
    getGarments();
  }, []);

  const getGarmentParts = async () => {
    const { data, error } =
      await supabase
        .from('garment_parts')
        .select(
          'id, garment_id, name, gender'
        )
        .eq('available', true)
        .order('name');

    if (error) {
      Alert.alert(
        'Error',
        error.message
      );
      return;
    }

    setGarmentParts(data || []);
  };

  const getGarments = async () => {
    const { data, error } =
      await supabase
        .from('garments')
        .select('id, name')
        .eq('available', true)
        .order('name');

    if (error) {
      Alert.alert(
        'Error',
        error.message
      );
      return;
    }

    setGarments(data || []);
  };

  const getGarmentName = (
    garmentId: string
  ) => {
    const garment =
      garments.find(
        item =>
          item.id === garmentId
      );

    return garment
      ? garment.name
      : 'Unknown Garment';
  };

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

      setImage(selectedImage.uri);

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

  const addDesign = async () => {
    if (!garmentPartId) {
      Alert.alert(
        'Required',
        'Please select a garment part.'
      );
      return;
    }

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

      const { error } =
        await supabase
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
        'Design added successfully.'
      );

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message
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
        Garment Part
      </Text>

      {garmentParts.map(item => {
        const garmentName =
          getGarmentName(
            item.garment_id
          );

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.partButton,
              garmentPartId ===
                item.id &&
                styles.selectedPart,
            ]}
            onPress={() =>
              setGarmentPartId(
                item.id
              )
            }
          >
            <Text
              style={[
                styles.partText,
                garmentPartId ===
                  item.id &&
                  styles.selectedPartText,
              ]}
            >
              {garmentName} -{' '}
              {item.name} -{' '}
              {item.gender}
            </Text>
          </TouchableOpacity>
        );
      })}

      {garmentParts.length === 0 && (
        <Text style={styles.noParts}>
          No available garment parts found.
        </Text>
      )}

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

  partButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
  },

  selectedPart: {
    borderColor: '#d96b8a',
    backgroundColor: '#fff5f8',
  },

  partText: {
    fontSize: 14,
    color: '#444',
  },

  selectedPartText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  noParts: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
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
