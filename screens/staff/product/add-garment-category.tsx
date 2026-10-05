import { useState } from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  'AddGarmentCategory'
>;

export default function AddGarmentCategoryScreen({
  navigation,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');

  const addCategory = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Error',
        'Please enter a category name.'
      );
      return;
    }

    const {
      error,
    } = await supabase
      .from('garment_categories')
      .insert({
        name: name.trim(),
        description:
          description.trim() || null,
      });

    if (error) {
      Alert.alert(
        'Error',
        error.message
      );
      return;
    }

    Alert.alert(
      'Success',
      'Category added successfully.',
      [
        {
          text: 'OK',
          onPress: () =>
            navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Add Garment Category
      </Text>

      <Text style={styles.label}>
        Category Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter category name"
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

      <TouchableOpacity
        style={styles.button}
        onPress={addCategory}
      >
        <Text style={styles.buttonText}>
          Add Category
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 25,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  button: {
    backgroundColor: '#d96b8a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});