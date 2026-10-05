import { useEffect, useState } from 'react';

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

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EditMeasurements'
>;

export default function EditMeasurementsScreen({
  navigation,
}: Props) {
  const [shoulder, setShoulder] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [topLength, setTopLength] = useState('');

  const [hips, setHips] = useState('');
  const [inseam, setInseam] = useState('');
  const [bottomLength, setBottomLength] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'You are not logged in.');
      return;
    }

    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      Alert.alert(
        'Error',
        'Failed to load your measurements.'
      );
      return;
    }

    if (data) {
      setShoulder(data.shoulder?.toString() || '');
      setChest(data.chest?.toString() || '');
      setWaist(data.waist?.toString() || '');
      setSleeveLength(
        data.sleeve_length?.toString() || ''
      );
      setTopLength(
        data.top_length?.toString() || ''
      );

      setHips(data.hips?.toString() || '');
      setInseam(data.inseam?.toString() || '');
      setBottomLength(
        data.bottom_length?.toString() || ''
      );
    }
  };

  const saveMeasurements = async () => {
    if (
      !shoulder ||
      !chest ||
      !waist ||
      !sleeveLength ||
      !topLength ||
      !hips ||
      !inseam ||
      !bottomLength
    ) {
      Alert.alert(
        'Missing Information',
        'Please enter all measurements.'
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Error',
        'You are not logged in.'
      );
      return;
    }

    setLoading(true);

    const measurementData = {
      user_id: user.id,
      shoulder: Number(shoulder),
      chest: Number(chest),
      waist: Number(waist),
      sleeve_length: Number(sleeveLength),
      top_length: Number(topLength),
      hips: Number(hips),
      inseam: Number(inseam),
      bottom_length: Number(bottomLength),
    };

    const { data: existingMeasurement } =
      await supabase
        .from('measurements')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    let error;

    if (existingMeasurement) {
      const result = await supabase
        .from('measurements')
        .update(measurementData)
        .eq('id', existingMeasurement.id);

      error = result.error;
    } else {
      const result = await supabase
        .from('measurements')
        .insert(measurementData);

      error = result.error;
    }

    setLoading(false);

    if (error) {
      Alert.alert(
        'Error',
        'Failed to save your measurements.'
      );
      return;
    }

    Alert.alert(
      'Success',
      'Your measurements have been saved.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Edit Measurements
          </Text>

          <View style={styles.headerSpace} />
        </View>

        <Text style={styles.unitText}>
          All measurements are in inches.
        </Text>

        <Text style={styles.sectionTitle}>
          Upper Body
        </Text>

        <Image
          source={require('../../../assets/upper.png')}
          style={styles.guideImage}
          resizeMode="contain"
        />

        <MeasurementInput
          title="Shoulder"
          value={shoulder}
          onChangeText={setShoulder}
        />

        <MeasurementInput
          title="Chest / Bust"
          value={chest}
          onChangeText={setChest}
        />

        <MeasurementInput
          title="Waist"
          value={waist}
          onChangeText={setWaist}
        />

        <MeasurementInput
          title="Sleeve Length"
          value={sleeveLength}
          onChangeText={setSleeveLength}
        />

        <MeasurementInput
          title="Top Length"
          value={topLength}
          onChangeText={setTopLength}
        />

        <Text style={styles.sectionTitle}>
          Lower Body
        </Text>

        <Image
          source={require('../../../assets/lower.png')}
          style={styles.guideImage}
          resizeMode="contain"
        />

        <MeasurementInput
          title="Hips"
          value={hips}
          onChangeText={setHips}
        />

        <MeasurementInput
          title="Inseam"
          value={inseam}
          onChangeText={setInseam}
        />

        <MeasurementInput
          title="Bottom Length"
          value={bottomLength}
          onChangeText={setBottomLength}
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveMeasurements}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading
              ? 'SAVING...'
              : 'SAVE MEASUREMENTS'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type MeasurementInputProps = {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
};

function MeasurementInput({
  title,
  value,
  onChangeText,
}: MeasurementInputProps) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.measurementTitle}>
        {title}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="0.0"
          placeholderTextColor="#aaa"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={onChangeText}
        />

        <Text style={styles.inches}>
          inches
        </Text>
      </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 5,
  },

  backButton: {
    fontSize: 40,
    color: '#d96b8a',
    lineHeight: 40,
  },

  headerSpace: {
    width: 30,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d96b8a',
  },

  unitText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },

  guideImage: {
    width: '100%',
    height: 400,
    marginBottom: 20,
  },

  inputContainer: {
    marginBottom: 15,
  },

  measurementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e8558a',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 15,
  },

  inches: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },

  saveButton: {
    backgroundColor: '#e8558a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

