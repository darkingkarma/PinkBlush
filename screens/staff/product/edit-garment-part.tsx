import {
  useEffect,
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
  'EditGarmentPart'
>;

type Garment = {
  id: string;
  name: string;
};

export default function EditGarmentPartScreen({
  navigation,
  route,
}: Props) {
  const { part } = route.params;

  const [garments, setGarments] =
    useState<Garment[]>([]);

  const [garmentId, setGarmentId] =
    useState(part.garment_id);

  const [name, setName] =
    useState(part.name);

  const [gender, setGender] =
    useState(part.gender);

  const [price, setPrice] =
    useState(String(part.price));

  const [description, setDescription] =
    useState(part.description || '');

  const [available, setAvailable] =
    useState(part.available);

  const getGarments = async () => {
    const {
      data,
      error,
    } = await supabase
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

  useEffect(() => {
    getGarments();
  }, []);

  const updatePart = async () => {
    if (!garmentId) {
      Alert.alert(
        'Error',
        'Please select a garment.'
      );
      return;
    }

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
        .update({
          garment_id: garmentId,
          name: name.trim(),
          gender: gender,
          price: priceNumber,
          description:
            description.trim() ||
            null,
          available: available,
        })
        .eq('id', part.id);

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Garment part updated successfully.',
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
        Edit Garment Part
      </Text>

      <Text style={styles.label}>
        Garment
      </Text>

      {garments.map((garment) => (
        <TouchableOpacity
          key={garment.id}
          style={[
            styles.option,
            garmentId === garment.id &&
              styles.selectedOption,
          ]}
          onPress={() =>
            setGarmentId(garment.id)
          }
        >
          <Text
            style={[
              styles.optionText,
              garmentId === garment.id &&
                styles.selectedOptionText,
            ]}
          >
            {garment.name}
          </Text>
        </TouchableOpacity>
      ))}

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

      <View
        style={styles.genderContainer}
      >
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

      <View
        style={
          styles.availabilityContainer
        }
      >
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
        style={styles.updateButton}
        onPress={updatePart}
      >
        <Text
          style={styles.updateButtonText}
        >
          Update Garment Part
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
    marginBottom: 20,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginTop: 15,
    marginBottom: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 13,
    borderRadius: 8,
    marginBottom: 8,
  },

  selectedOption: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },

  optionText: {
    color: '#444',
    fontSize: 15,
  },

  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  selectedGender: {
    backgroundColor: '#d96b8a',
    borderColor: '#d96b8a',
  },

  genderText: {
    color: '#555',
  },

  selectedGenderText: {
    color: '#fff',
    fontWeight: '600',
  },

  availabilityContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  availabilityButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  selectedAvailable: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },

  selectedUnavailable: {
    backgroundColor: '#d9534f',
    borderColor: '#d9534f',
  },

  availabilityText: {
    color: '#555',
    fontWeight: '600',
  },

  selectedAvailabilityText: {
    color: '#fff',
  },

  selectedUnavailableText: {
    color: '#fff',
  },

  updateButton: {
    backgroundColor: '#d96b8a',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
  },

  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});