
import { useState } from 'react';

import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  'ReviewOrder'
>;

export default function ReviewOrderScreen({
  route,
  navigation,
}: Props) {
  const { orderData, measurement } = route.params;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (submitting) return;

    // Validate order details
    if (!orderData.items || orderData.items.length === 0) {
      Alert.alert('Invalid Order', 'Please select at least one garment part.');
      return;
    }

    if (!measurement?.id) {
      Alert.alert(
        'Missing Measurements',
        'Please complete your measurements before submitting your order.'
      );
      return;
    }

    if (
      !Number.isFinite(orderData.totalAmount) ||
      orderData.totalAmount <= 0
    ) {
      Alert.alert('Invalid Total', 'Please check your order total.');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Login Required', 'Please log in before submitting your order.');
        return;
      }

      // 1. Create the order
      const {
        data: order,
        error: orderError,
      } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          measurement_id: measurement.id,
          status: 'Pending',
          total_amount: orderData.totalAmount,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Order creation failed:', orderError);

        Alert.alert(
          'Submission Failed',
          'Your order could not be created. Please try again.'
        );
        return;
      }

      // 2. Save all order items
      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        garment_id: orderData.garment.id,
        garment_part_id: item.partId,
        design_id: item.designId,
        fabric_id: item.fabricId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items insertion failed:', itemsError);

        // 3. Attempt to remove the incomplete order
        const { error: rollbackError } = await supabase
          .from('orders')
          .delete()
          .eq('id', order.id)
          .eq('customer_id', user.id);

        if (rollbackError) {
          console.error('Order cleanup failed:', rollbackError);

          Alert.alert(
            'Order Needs Attention',
            'The order was created, but its items could not be saved. Please contact staff before submitting again.'
          );
        } else {
          Alert.alert(
            'Submission Failed',
            'Your order items could not be saved. The incomplete order was removed. Please try again.'
          );
        }

        return;
      }

      // 4. Confirm successful submission
      Alert.alert(
        'Order Submitted Successfully!',
        `Your order has been saved.\n\nOrder Reference: ${order.id}\nStatus: Pending\n\nStaff will review your order and prepare your quotation.`,
        [
          {
            text: 'Go to Home',
            onPress: () => {
              navigation.navigate('Main');
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Unexpected submission error:', error);

      Alert.alert(
        'Error',
        'Something went wrong while submitting your order. Please check your order history before trying again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Review Order</Text>

        <Text style={styles.garmentName}>
          {orderData.garment.name}
        </Text>

        <Text style={styles.sectionTitle}>
          Selected Parts
        </Text>

        {orderData.items.map((item) => (
          <View key={item.partId} style={styles.card}>
            <Text style={styles.partName}>
              {item.partName}
            </Text>

            <Text style={styles.detailLabel}>
              Selected Design
            </Text>

            {item.designImage ? (
              <Image
                source={{ uri: item.designImage }}
                style={styles.designImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.designPlaceholder}>
                <Text style={styles.placeholderText}>
                  No design image available
                </Text>
              </View>
            )}

            <Text style={styles.designName}>
              {item.designName || 'No design selected'}
            </Text>

            <View style={styles.infoBlock}>
              <Text style={styles.detailLabel}>
                Selected Fabric
              </Text>

              <Text style={styles.detail}>
                {item.fabricName || 'None selected'}
              </Text>
            </View>

            <Text style={styles.detail}>
              Quantity: {item.quantity}
            </Text>

            <Text style={styles.detail}>
              Unit Price: ₱{item.unitPrice.toFixed(2)}
            </Text>

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>
                Subtotal
              </Text>

              <Text style={styles.subtotal}>
                ₱{item.subtotal.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          Measurements
        </Text>

        <View style={styles.card}>
          <MeasurementRow title="Shoulder" value={measurement.shoulder} />
          <MeasurementRow title="Chest / Bust" value={measurement.chest} />
          <MeasurementRow title="Waist" value={measurement.waist} />
          <MeasurementRow title="Sleeve Length" value={measurement.sleeve_length} />
          <MeasurementRow title="Top Length" value={measurement.top_length} />
          <MeasurementRow title="Hips" value={measurement.hips} />
          <MeasurementRow title="Inseam" value={measurement.inseam} />
          <MeasurementRow title="Bottom Length" value={measurement.bottom_length} />
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Amount</Text>

          <Text style={styles.totalAmount}>
            ₱{orderData.totalAmount.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitOrder}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'SUBMITTING...' : 'SUBMIT ORDER'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type MeasurementRowProps = {
  title: string;
  value: number | null;
};

function MeasurementRow({
  title,
  value,
}: MeasurementRowProps) {
  return (
    <View style={styles.measurementRow}>
      <Text style={styles.measurementName}>{title}</Text>

      <Text style={styles.measurementValue}>
        {value === null || value === undefined
          ? '-'
          : `${value} inches`}
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

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },

  garmentName: {
    fontSize: 19,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 5,
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
  },

  partName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },

  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },

  designImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },

  designPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#f7f0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    color: '#999',
    fontSize: 13,
  },

  designName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d96b8a',
    marginTop: 8,
    marginBottom: 16,
  },

  infoBlock: {
    marginBottom: 8,
  },

  detail: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
  },

  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 12,
    paddingTop: 12,
  },

  subtotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  subtotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#d96b8a',
  },

  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  measurementName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  measurementValue: {
    fontSize: 14,
    color: '#d96b8a',
    fontWeight: '600',
  },

  totalBox: {
    backgroundColor: '#fdf1f5',
    borderRadius: 10,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#d96b8a',
  },

  submitButton: {
    backgroundColor: '#d96b8a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
