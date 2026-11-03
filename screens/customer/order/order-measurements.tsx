import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  RootStackParamList,
} from '../../../navigator';

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
  const { width } = useWindowDimensions();

  const [measurements, setMeasurements] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState(false);

  const loadMeasurements = async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMeasurements(null);

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

        setMeasurements(null);
        setLoadError(true);
        return;
      }

      setMeasurements(data);
    } catch (error) {
      console.error(error);

      setMeasurements(null);
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

  const formatMeasurement = (value: any) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '-';
    }

    return `${value} cm`;
  };

  const continueToReview = () => {
    if (loading) return;

    if (!measurements) {
      Alert.alert(
        'Measurements Required',
        'Please add your measurements before continuing.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add Measurements',
            onPress: () =>
              navigation.navigate('EditMeasurements'),
          },
        ]
      );

      return;
    }

    const requiredMeasurements = [
      measurements.shoulder,
      measurements.chest,
      measurements.waist,
      measurements.sleeve_length,
      measurements.top_length,
      measurements.hips,
      measurements.inseam,
      measurements.bottom_length,
    ];

    const hasMissingMeasurements =
      requiredMeasurements.some(
        value =>
          value === null ||
          value === undefined ||
          value === ''
      );

    if (hasMissingMeasurements) {
      Alert.alert(
        'Incomplete Measurements',
        'Please complete all your measurements before continuing.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Edit Measurements',
            onPress: () =>
              navigation.navigate('EditMeasurements'),
          },
        ]
      );

      return;
    }

    const measurementData = {
      id: measurements.id,
      shoulder: measurements.shoulder,
      chest: measurements.chest,
      waist: measurements.waist,
      sleeve_length: measurements.sleeve_length,
      top_length: measurements.top_length,
      hips: measurements.hips,
      inseam: measurements.inseam,
      bottom_length: measurements.bottom_length,
    };

    // CUSTOM ORDER FLOW
    if (route.params.customOrderData) {
      navigation.navigate('ReviewCustomOrder', {
        customOrderData: route.params.customOrderData,
        measurement: measurementData,
      });

      return;
    }

    // CATALOG ORDER FLOW
    if (route.params.orderData) {
      navigation.navigate('ReviewOrder', {
        orderData: route.params.orderData,
        measurement: measurementData,
      });

      return;
    }

    Alert.alert(
      'Error',
      'Order information is missing. Please try again.'
    );
  };

  const isSmallScreen = width < 360;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isSmallScreen ? 14 : 20,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Order Measurements
          </Text>
        </View>

        <Text style={styles.infoText}>
          These measurements will be used to create your garment.
          Make sure your measurements are accurate.
        </Text>

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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              Unable to Load Measurements
            </Text>

            <Text style={styles.emptyText}>
              Please check your internet connection and try again.
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
        ) : !measurements ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No Measurements Found
            </Text>

            <Text style={styles.emptyText}>
              You need to save your body measurements before placing an order.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() =>
                navigation.navigate('EditMeasurements')
              }
            >
              <Text style={styles.retryButtonText}>
                ADD MEASUREMENTS
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Upper Body
            </Text>

            <View style={styles.measurementCard}>
              <MeasurementRow
                title="Shoulder"
                value={formatMeasurement(
                  measurements.shoulder
                )}
              />

              <MeasurementRow
                title="Chest / Bust"
                value={formatMeasurement(
                  measurements.chest
                )}
              />

              <MeasurementRow
                title="Waist"
                value={formatMeasurement(
                  measurements.waist
                )}
              />

              <MeasurementRow
                title="Sleeve Length"
                value={formatMeasurement(
                  measurements.sleeve_length
                )}
              />

              <MeasurementRow
                title="Top Length"
                value={formatMeasurement(
                  measurements.top_length
                )}
                last
              />
            </View>

            <Text style={styles.sectionTitle}>
              Lower Body
            </Text>

            <View style={styles.measurementCard}>
              <MeasurementRow
                title="Hips"
                value={formatMeasurement(
                  measurements.hips
                )}
              />

              <MeasurementRow
                title="Inseam"
                value={formatMeasurement(
                  measurements.inseam
                )}
              />

              <MeasurementRow
                title="Bottom Length"
                value={formatMeasurement(
                  measurements.bottom_length
                )}
                last
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate('EditMeasurements')
          }
        >
          <Text style={styles.editButtonText}>
            EDIT MEASUREMENTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (loading || loadError || !measurements) && {
              opacity: 0.5,
            },
          ]}
          onPress={continueToReview}
          disabled={loading || loadError}
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
  last?: boolean;
};

function MeasurementRow({
  title,
  value,
  last = false,
}: MeasurementRowProps) {
  return (
    <View
      style={[
        styles.row,
        last && styles.lastRow,
      ]}
    >
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
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d96b8a',
    textAlign: 'center',
  },

  infoText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 21,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 5,
  },

  measurementCard: {
    backgroundColor: '#fdf1f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 25,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3d5df',
    gap: 8,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  measurementName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    flexShrink: 1,
  },

  measurementValue: {
    fontSize: 15,
    color: '#d96b8a',
    fontWeight: 'bold',
  },

  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 14,
  },

  emptyContainer: {
    backgroundColor: '#fdf1f5',
    padding: 22,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 21,
  },

  retryButton: {
    backgroundColor: '#e8558a',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9,
    marginTop: 18,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 13,
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