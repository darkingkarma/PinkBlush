
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../../supabase';
import type { RootStackParamList } from '../../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ReviewCustomOrder'
>;

export default function ReviewCustomOrderScreen({
  navigation,
  route,
}: Props) {
  const { customOrderData, measurement } = route.params;

  const { width } = useWindowDimensions();

  const horizontalPadding =
    width < 380 ? 14 : width < 600 ? 20 : 28;

  const imageHeight = Math.min(
    Math.max(width * 0.5, 180),
    300
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  // =========================================
  // LOAD REFERENCE IMAGE
  // =========================================

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!customOrderData.referenceImagePath) {
        setImageUrl(null);
        return;
      }

      setLoadingImage(true);

      try {
        const { data, error } = await supabase.storage
          .from('custom-order-images')
          .createSignedUrl(
            customOrderData.referenceImagePath,
            3600
          );

        if (error) {
          throw error;
        }

        if (isMounted) {
          setImageUrl(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading reference image:', error);

        if (isMounted) {
          setImageUrl(null);
        }
      } finally {
        if (isMounted) {
          setLoadingImage(false);
        }
      }
    };

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [customOrderData.referenceImagePath]);

  // =========================================
  // FORMAT DATE
  // =========================================

  const formatDate = (date: string | null) => {
    if (!date) return 'Not specified';

    const parts = date.split('-');

    if (parts.length !== 3) return date;

    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  // =========================================
  // MEASUREMENT ROW
  // =========================================

  const MeasurementRow = ({
    label,
    value,
  }: {
    label: string;
    value: number | null;
  }) => (
    <View style={styles.measurementRow}>
      <Text style={styles.measurementLabel}>
        {label}
      </Text>

      <Text style={styles.measurementValue}>
        {value !== null && value !== undefined
          ? `${value} cm`
          : 'Not provided'}
      </Text>
    </View>
  );

  // =========================================
  // VALIDATE CUSTOM ORDER
  // =========================================

  const validateOrder = () => {
    if (!customOrderData.garmentDescription?.trim()) {
      Alert.alert(
        'Missing Description',
        'Please provide a description of the garment you want.'
      );
      return false;
    }

    const requiredMeasurements = [
      { label: 'Shoulder', value: measurement.shoulder },
      { label: 'Chest / Bust', value: measurement.chest },
      { label: 'Waist', value: measurement.waist },
      { label: 'Sleeve Length', value: measurement.sleeve_length },
      { label: 'Top Length', value: measurement.top_length },
      { label: 'Hips', value: measurement.hips },
      { label: 'Inseam', value: measurement.inseam },
      { label: 'Bottom Length', value: measurement.bottom_length },
    ];

    const missingMeasurement = requiredMeasurements.find(
      (item) =>
        item.value === null ||
        item.value === undefined ||
        !Number.isFinite(Number(item.value)) ||
        Number(item.value) <= 0
    );

    if (missingMeasurement) {
      Alert.alert(
        'Incomplete Measurements',
        `Please provide a valid ${missingMeasurement.label} measurement before submitting.`
      );

      return false;
    }

    return true;
  };

  // =========================================
  // SUBMIT CUSTOM ORDER
  // =========================================

  const handleSubmit = () => {
    if (loading) return;

    if (!validateOrder()) return;

    Alert.alert(
      'Submit Custom Order',
      'Are you sure you want to submit this custom garment request? Staff will review your request and prepare a quotation.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            if (loading) return;

            setLoading(true);

            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError || !user) {
                throw new Error('Please log in again.');
              }

              const measurementSnapshot = {
                shoulder: Number(measurement.shoulder),
                chest: Number(measurement.chest),
                waist: Number(measurement.waist),
                sleeve_length: Number(measurement.sleeve_length),
                top_length: Number(measurement.top_length),
                hips: Number(measurement.hips),
                inseam: Number(measurement.inseam),
                bottom_length: Number(measurement.bottom_length),
              };

              const { error } = await supabase
                .from('custom_orders')
                .insert({
                  user_id: user.id,

                  measurement_id: measurement.id,
                  measurement_snapshot: measurementSnapshot,

                  reference_image_url:
                    customOrderData.referenceImagePath || null,

                  garment_description:
                    customOrderData.garmentDescription.trim(),

                  preferred_color:
                    customOrderData.preferredColor?.trim() || null,

                  fabric_preference:
                    customOrderData.fabricPreference?.trim() || null,

                  needed_by_date:
                    customOrderData.neededByDate || null,

                  special_instructions:
                    customOrderData.specialInstructions?.trim() || null,

                  status: 'submitted',
                });

              if (error) {
                throw error;
              }

              Alert.alert(
                'Request Submitted!',
                'Your custom garment request has been submitted successfully. Staff will review your request and measurements and prepare a quotation. You can pay your online deposit after accepting the quotation.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.navigate('Main');
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error(
                'Custom order submission error:',
                error
              );

              Alert.alert(
                'Submission Failed',
                error?.message ||
                  'Unable to submit your custom order. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // =========================================
  // SCREEN UI
  // =========================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.innerContent}>
        <Text style={styles.title}>
          Review Your Custom Order
        </Text>

        <Text style={styles.subtitle}>
          Check your garment details and measurements before submitting.
        </Text>

        {/* REFERENCE IMAGE */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Reference Image
          </Text>

          {loadingImage ? (
            <View
              style={[
                styles.imageLoading,
                { height: imageHeight },
              ]}
            >
              <ActivityIndicator color="#D96B8A" />

              <Text style={styles.noImageText}>
                Loading reference image...
              </Text>
            </View>
          ) : imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.referenceImage,
                { height: imageHeight },
              ]}
              resizeMode="contain"
              onError={() => setImageUrl(null)}
              accessibilityLabel="Custom garment reference image"
            />
          ) : (
            <View
              style={[
                styles.noImage,
                { height: imageHeight },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={32}
                color="#C9AAB5"
              />

              <Text style={styles.noImageText}>
                No reference image available
              </Text>
            </View>
          )}
        </View>

        {/* GARMENT DETAILS */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Garment Details
          </Text>

          <Text style={styles.label}>
            Description
          </Text>

          <Text style={styles.value}>
            {customOrderData.garmentDescription || 'Not provided'}
          </Text>

          <Text style={styles.label}>
            Preferred Color
          </Text>

          <Text style={styles.value}>
            {customOrderData.preferredColor || 'Not specified'}
          </Text>

          <Text style={styles.label}>
            Fabric Preference
          </Text>

          <Text style={styles.value}>
            {customOrderData.fabricPreference || 'Not specified'}
          </Text>

          <Text style={styles.label}>
            Needed By
          </Text>

          <Text style={styles.value}>
            {formatDate(customOrderData.neededByDate)}
          </Text>

          <Text style={styles.label}>
            Special Instructions
          </Text>

          <Text style={styles.value}>
            {customOrderData.specialInstructions || 'None'}
          </Text>
        </View>

        {/* MEASUREMENTS */}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Your Measurements
          </Text>

          <Text style={styles.groupTitle}>
            Upper Body
          </Text>

          <MeasurementRow
            label="Shoulder"
            value={measurement.shoulder}
          />

          <MeasurementRow
            label="Chest / Bust"
            value={measurement.chest}
          />

          <MeasurementRow
            label="Waist"
            value={measurement.waist}
          />

          <MeasurementRow
            label="Sleeve Length"
            value={measurement.sleeve_length}
          />

          <MeasurementRow
            label="Top Length"
            value={measurement.top_length}
          />

          <Text style={styles.groupTitle}>
            Lower Body
          </Text>

          <MeasurementRow
            label="Hips"
            value={measurement.hips}
          />

          <MeasurementRow
            label="Inseam"
            value={measurement.inseam}
          />

          <MeasurementRow
            label="Bottom Length"
            value={measurement.bottom_length}
          />

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditMeasurements')}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Edit my measurements"
          >
            <Ionicons
              name="create-outline"
              size={17}
              color="#D96B8A"
            />

            <Text style={styles.editButtonText}>
              Edit My Measurements
            </Text>
          </TouchableOpacity>
        </View>

        {/* WHAT HAPPENS NEXT */}

        <View style={styles.notice}>
          <View style={styles.noticeHeader}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#A63D65"
            />

            <Text style={styles.noticeTitle}>
              What Happens Next?
            </Text>
          </View>

          <Text style={styles.noticeText}>
            1. Staff reviews your custom order and measurements.
          </Text>

          <Text style={styles.noticeText}>
            2. Staff prepares a quotation for your approval.
          </Text>

          <Text style={styles.noticeText}>
            3. You accept or reject the quotation.
          </Text>

          <Text style={styles.noticeText}>
            4. After accepting, you pay the deposit online through GCash or PayPal.
          </Text>

          <Text style={styles.noticeText}>
            5. The remaining balance is paid in cash when you pick up your garment.
          </Text>
        </View>

        {/* SUBMIT BUTTON */}

        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Submit custom order"
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator color="#FFFFFF" />

              <Text style={styles.submitButtonText}>
                Submitting...
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              Submit Custom Order
            </Text>
          )}
        </TouchableOpacity>

        {/* BACK BUTTON */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// =========================================
// STYLES
// =========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  content: {
    paddingTop: 20,
    paddingBottom: 35,
    width: '100%',
    alignItems: 'center',
  },

  innerContent: {
    width: '100%',
    maxWidth: 760,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#3F2630',
  },

  subtitle: {
    fontSize: 13,
    color: '#8C6674',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3E1E7',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3F2630',
    marginBottom: 15,
  },

  referenceImage: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#FFF8FA',
  },

  imageLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
  },

  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8FA',
    borderRadius: 10,
  },

  noImageText: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A7180',
    marginTop: 12,
  },

  value: {
    fontSize: 14,
    color: '#3F2630',
    marginTop: 4,
    lineHeight: 21,
  },

  groupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D96B8A',
    marginTop: 8,
    marginBottom: 8,
  },

  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5E9ED',
  },

  measurementLabel: {
    fontSize: 13,
    color: '#765563',
    flexShrink: 1,
  },

  measurementValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F2630',
    textAlign: 'right',
    flexShrink: 0,
  },

  editButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D96B8A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  editButtonText: {
    color: '#D96B8A',
    fontWeight: '700',
    fontSize: 13,
  },

  notice: {
    backgroundColor: '#FCEEF3',
    padding: 15,
    borderRadius: 12,
    marginBottom: 18,
  },

  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A63D65',
  },

  noticeText: {
    fontSize: 12,
    color: '#765563',
    lineHeight: 19,
    marginBottom: 5,
  },

  submitButton: {
    backgroundColor: '#D96B8A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  backButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 5,
  },

  backButtonText: {
    color: '#9A7180',
    fontWeight: '700',
    fontSize: 13,
  },
});
