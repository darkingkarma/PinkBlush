import {
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
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
  'AddGarmentPart'
>;

export default function AddGarmentPartScreen({
  route,
  navigation,
}: Props) {
  const {
    garmentId,
  } = route.params;

  const [name, setName] =
    useState('');

  const [gender, setGender] =
    useState('Unisex');

  const [price, setPrice] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [available, setAvailable] =
    useState(true);

  const addPart = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Error',
        'Please enter a part name.'
      );
      return;
    }

    if (!price.trim()) {
      Alert.alert(
        'Error',
        'Please enter a price.'
      );
      return;
    }

    const priceNumber =
      Number(price);

    if (isNaN(priceNumber)) {
      Alert.alert(
        'Error',
        'Please enter a valid price.'
      );
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from('garment_parts')
        .insert({
          garment_id: garmentId,
          name: name.trim(),
          gender: gender,
          price: priceNumber,
          description:
            description.trim() || null,
          available: available,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Garment part added successfully.',
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
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.title}>
        Add Garment Part
      </Text>

      <Text style={styles.label}>
        Part Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Upper"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Gender
      </Text>

      <View style={styles.genderContainer}>
        {[
          'Male',
          'Female',
          'Unisex',
        ].map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.genderButton,
              gender === item &&
                styles.selectedGender,
            ]}
            onPress={() =>
              setGender(item)
            }
          >
            <Text
              style={[
                styles.genderText,
                gender === item &&
                  styles.selectedGenderText,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>
        Price
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Example: 500"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
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
        Availability
      </Text>

      <View style={styles.availabilityContainer}>
        <TouchableOpacity
          style={[
            styles.availabilityButton,
            available &&
              styles.selectedAvailable,
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
              styles.selectedUnavailable,
          ]}
          onPress={() =>
            setAvailable(false)
          }
        >
          <Text
            style={[
              styles.availabilityText,
              !available &&
                styles.selectedUnavailableText,
            ]}
          >
            Not Available
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={addPart}
      >
        <Text style={styles.addButtonText}>
          Add Garment Part
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  genderContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  selectedGender: {
    backgroundColor: '#fce8ee',
    borderColor: '#d96b8a',
  },

  genderText: {
    color: '#555',
  },

  selectedGenderText: {
    color: '#d96b8a',
    fontWeight: '600',
  },

  availabilityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  availabilityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  selectedAvailable: {
    backgroundColor: '#e8f7ed',
    borderColor: '#4caf50',
  },

  selectedUnavailable: {
    backgroundColor: '#fce8e8',
    borderColor: '#d9534f',
  },

  availabilityText: {
    color: '#555',
  },

  selectedAvailabilityText: {
    color: '#4caf50',
    fontWeight: '600',
  },

  selectedUnavailableText: {
    color: '#d9534f',
    fontWeight: '600',
  },

  addButton: {
    backgroundColor: '#d96b8a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
