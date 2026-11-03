import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../../navigator';
import { supabase } from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'EditMeasurements'
>;

export default function EditMeasurementsScreen({
  navigation,
}: Props) {
  const { width } = useWindowDimensions();

  const [shoulder, setShoulder] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [topLength, setTopLength] = useState('');

  const [hips, setHips] = useState('');
  const [inseam, setInseam] = useState('');
  const [bottomLength, setBottomLength] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadMeasurements = async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Error',
          'You are not logged in.'
        );
        return;
      }

      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error(
          'Load measurements error:',
          error
        );

        setLoadError(true);
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
      } else {
        setShoulder('');
        setChest('');
        setWaist('');
        setSleeveLength('');
        setTopLength('');
        setHips('');
        setInseam('');
        setBottomLength('');
      }
    } catch (error) {
      console.error(error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMeasurements();
    }, [])
  );

  const handleMeasurementChange = (
    value: string,
    setter: (value: string) => void
  ) => {
    // Allow only positive decimal number input.
    const cleaned = value.replace(/[^0-9.]/g, '');

    // Allow only one decimal point.
    const parts = cleaned.split('.');

    const formatted =
      parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : cleaned;

    setter(formatted);
  };

  const saveMeasurements = async () => {
    if (saving || loading) return;

    const values = [
      { name: 'Shoulder', value: shoulder },
      { name: 'Chest / Bust', value: chest },
      { name: 'Waist', value: waist },
      { name: 'Sleeve Length', value: sleeveLength },
      { name: 'Top Length', value: topLength },
      { name: 'Hips', value: hips },
      { name: 'Inseam', value: inseam },
      { name: 'Bottom Length', value: bottomLength },
    ];

    const missing = values.find(
      item => item.value.trim() === ''
    );

    if (missing) {
      Alert.alert(
        'Missing Information',
        `Please enter your ${missing.name} measurement.`
      );
      return;
    }

    const invalid = values.find(item => {
      const number = Number(item.value);

      return (
        !Number.isFinite(number) ||
        number <= 0
      );
    });

    if (invalid) {
      Alert.alert(
        'Invalid Measurement',
        `Please enter a valid positive number for ${invalid.name}.`
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Error',
          'You are not logged in.'
        );
        return;
      }

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

      const {
        data: existingMeasurement,
        error: checkError,
      } = await supabase
        .from('measurements')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let saveError;

      if (existingMeasurement) {
        const result = await supabase
          .from('measurements')
          .update(measurementData)
          .eq('id', existingMeasurement.id);

        saveError = result.error;
      } else {
        const result = await supabase
          .from('measurements')
          .insert(measurementData);

        saveError = result.error;
      }

      if (saveError) {
        throw saveError;
      }

      Alert.alert(
        'Success',
        'Your measurements have been saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Save measurements error:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to save your measurements. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const guideHeight = Math.min(
    Math.max(width * 0.95, 260),
    400
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          Edit Measurements
        </Text>

        <Text style={styles.description}>
          Enter your body measurements accurately to help us create a garment that fits you properly.
        </Text>

        <View style={styles.unitCard}>
          <Text style={styles.unitText}>
            All measurements are in centimeters (cm).
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#e8558a"
            />

            <Text style={styles.loadingText}>
              Loading your measurements...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Unable to load your measurements.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadMeasurements}
            >
              <Text style={styles.retryButtonText}>
                TRY AGAIN
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Upper Body
            </Text>

            <Image
              source={require('../../../assets/upper.png')}
              style={[
                styles.guideImage,
                { height: guideHeight },
              ]}
              resizeMode="contain"
            />

            <MeasurementInput
              title="Shoulder"
              value={shoulder}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setShoulder
                )
              }
            />

            <MeasurementInput
              title="Chest / Bust"
              value={chest}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setChest
                )
              }
            />

            <MeasurementInput
              title="Waist"
              value={waist}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setWaist
                )
              }
            />

            <MeasurementInput
              title="Sleeve Length"
              value={sleeveLength}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setSleeveLength
                )
              }
            />

            <MeasurementInput
              title="Top Length"
              value={topLength}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setTopLength
                )
              }
            />

            <Text style={styles.sectionTitle}>
              Lower Body
            </Text>

            <Image
              source={require('../../../assets/lower.png')}
              style={[
                styles.guideImage,
                { height: guideHeight },
              ]}
              resizeMode="contain"
            />

            <MeasurementInput
              title="Hips"
              value={hips}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setHips
                )
              }
            />

            <MeasurementInput
              title="Inseam"
              value={inseam}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setInseam
                )
              }
            />

            <MeasurementInput
              title="Bottom Length"
              value={bottomLength}
              onChangeText={value =>
                handleMeasurementChange(
                  value,
                  setBottomLength
                )
              }
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={saveMeasurements}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingContent}>
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />

                  <Text style={styles.saveButtonText}>
                    SAVING...
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>
                  SAVE MEASUREMENTS
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
          placeholder="Enter measurement"
          placeholderTextColor="#aaa"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={onChangeText}
          maxLength={7}
        />

        <Text style={styles.unitLabel}>
          cm
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d96b8a',
    textAlign: 'center',
    marginBottom: 10,
  },

  description: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  unitCard: {
    backgroundColor: '#fdf1f5',
    borderRadius: 10,
    padding: 13,
    marginBottom: 20,
  },

  unitText: {
    textAlign: 'center',
    color: '#d96b8a',
    fontSize: 13,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 15,
  },

  guideImage: {
    width: '100%',
    marginBottom: 20,
    alignSelf: 'center',
  },

  inputContainer: {
    marginBottom: 17,
  },

  measurementTitle: {
    fontSize: 15,
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
    minWidth: 0,
    borderWidth: 1.5,
    borderColor: '#e8558a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#333',
  },

  unitLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: '#e8558a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 20,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  savingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 14,
  },

  errorContainer: {
    backgroundColor: '#fdf1f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
  },

  errorText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: '#e8558a',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },

  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});