import { useEffect, useState } from 'react';

import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { decode } from 'base64-arraybuffer';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'AddGarment'
>;

type Category = {
  id: string;
  name: string;
};

export default function AddGarmentScreen({
  navigation,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    const { data, error } = await supabase
      .from('garment_categories')
      .select('id, name')
      .order('name');

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setCategories(data || []);
  };

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos.'
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

    if (!result.canceled) {
      const selectedImage = result.assets[0];

      setImage(selectedImage.uri);

      setImageBase64(
        selectedImage.base64 || null
      );

      setImageType(
        selectedImage.mimeType || 'image/jpeg'
      );
    }
  };

  const uploadImage = async () => {
    if (!imageBase64) {
      return null;
    }

    let extension = 'jpg';

    if (imageType === 'image/png') {
      extension = 'png';
    } else if (imageType === 'image/webp') {
      extension = 'webp';
    } else if (imageType === 'image/gif') {
      extension = 'gif';
    }

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

    const arrayBuffer = decode(imageBase64);

    const { error } = await supabase.storage
      .from('garments')
      .upload(fileName, arrayBuffer, {
        contentType: imageType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from('garments')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const addGarment = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Required',
        'Please enter a garment name.'
      );
      return;
    }

    if (!selectedCategory) {
      Alert.alert(
        'Required',
        'Please select a category.'
      );
      return;
    }

    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      const { error } = await supabase
        .from('garments')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category_id: selectedCategory,
          image_url: imageUrl,
          available: true,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Garment added successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          Add Garment
        </Text>

        <Text style={styles.label}>
          Garment Image
        </Text>

        <TouchableOpacity
          style={styles.imagePicker}
          onPress={pickImage}
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
            />
          ) : (
            <>
              <Text style={styles.imageIcon}>
                📷
              </Text>

              <Text style={styles.imageText}>
                Select Image
              </Text>
            </>
          )}
        </TouchableOpacity>

        {image && (
          <TouchableOpacity
            onPress={pickImage}
            style={styles.changeImageButton}
          >
            <Text style={styles.changeImageText}>
              Change Image
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>
          Garment Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Example: SMC Uniform"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>
          Category
        </Text>

        <View style={styles.categoryContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id &&
                  styles.selectedCategory,
              ]}
              onPress={() =>
                setSelectedCategory(category.id)
              }
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id &&
                    styles.selectedCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
          placeholder="Optional description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={addGarment}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading
              ? 'Saving...'
              : 'Add Garment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d96b8a',
    marginTop: 20,
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },

  imagePicker: {
    height: 220,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  imageIcon: {
    fontSize: 40,
    marginBottom: 8,
  },

  imageText: {
    fontSize: 14,
    color: '#888',
  },

  changeImageButton: {
    alignItems: 'center',
    marginTop: 8,
  },

  changeImageText: {
    color: '#d96b8a',
    fontSize: 13,
    fontWeight: 'bold',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  categoryContainer: {
    marginBottom: 10,
  },

  categoryButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
  },

  selectedCategory: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },

  categoryText: {
    fontSize: 14,
    color: '#555',
  },

  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  saveButton: {
    backgroundColor: '#d96b8a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
