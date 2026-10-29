import { useCallback, useState } from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../navigator';

import {
  supabase,
} from '../../../supabase';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'OrderMeasurements'
>;

export default function OrderMeasurementsScreen({
  navigation,
  route,
}: Props) {
  const [measurements, setMeasurements] =
    useState<any>(null);

  const loadMeasurements = async () => {
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

    setMeasurements(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadMeasurements();
    }, [])
  );

  const formatMeasurement = (value: any) => {
    if (
      value === null ||
      value === undefined
    ) {
      return '-';
    }

    return `${value} cm`;
  };

  const continueToReview = () => {
    if (!measurements) {
      Alert.alert(
        'Measurements Required',
        'Please add your measurements before continuing.'
      );
      return;
    }

    navigation.navigate('ReviewOrder', {
      orderData: route.params.orderData,
      measurement: {
        id: measurements.id,
        shoulder: measurements.shoulder,
        chest: measurements.chest,
        waist: measurements.waist,
        sleeve_length: measurements.sleeve_length,
        top_length: measurements.top_length,
        hips: measurements.hips,
        inseam: measurements.inseam,
        bottom_length: measurements.bottom_length,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>

          <Text style={styles.title}>
            Order Measurements
          </Text>

          <View style={styles.headerSpace} />
        </View>

        <Text style={styles.infoText}>
          These measurements will be used for your order.
        </Text>

        <Text style={styles.sectionTitle}>
          Upper Body
        </Text>

        <View style={styles.measurementCard}>
          <MeasurementRow
            title="Shoulder"
            value={formatMeasurement(
              measurements?.shoulder
            )}
          />

          <MeasurementRow
            title="Chest / Bust"
            value={formatMeasurement(
              measurements?.chest
            )}
          />

          <MeasurementRow
            title="Waist"
            value={formatMeasurement(
              measurements?.waist
            )}
          />

          <MeasurementRow
            title="Sleeve Length"
            value={formatMeasurement(
              measurements?.sleeve_length
            )}
          />

          <MeasurementRow
            title="Top Length"
            value={formatMeasurement(
              measurements?.top_length
            )}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Lower Body
        </Text>

        <View style={styles.measurementCard}>
          <MeasurementRow
            title="Hips"
            value={formatMeasurement(
              measurements?.hips
            )}
          />

          <MeasurementRow
            title="Inseam"
            value={formatMeasurement(
              measurements?.inseam
            )}
          />

          <MeasurementRow
            title="Bottom Length"
            value={formatMeasurement(
              measurements?.bottom_length
            )}
          />
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate(
              'EditMeasurements'
            )
          }
        >
          <Text style={styles.editButtonText}>
            EDIT MEASUREMENTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={continueToReview}
        >
          <Text style={styles.continueButtonText}>
            CONTINUE TO REVIEW
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type MeasurementRowProps = {
  title: string;
  value: string;
};

function MeasurementRow({
  title,
  value,
}: MeasurementRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.measurementName}>
        {title}
      </Text>

      <Text style={styles.measurementValue}>
        {value}
      </Text>
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
    marginBottom: 20,
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

  infoText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 25,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 5,
  },

  measurementCard: {
    backgroundColor: '#fdf1f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3d5df',
  },

  measurementName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },

  measurementValue: {
    fontSize: 15,
    color: '#d96b8a',
    fontWeight: 'bold',
  },

  editButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8558a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },

  editButtonText: {
    color: '#e8558a',
    fontSize: 15,
    fontWeight: 'bold',
  },

  continueButton: {
    backgroundColor: '#e8558a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  continueButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
