import {
  useState,
} from 'react';

import {
  Alert,
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
  const {
    orderData,
    measurement,
  } = route.params;

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Error',
          'You are not logged in.'
        );

        return;
      }

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

      if (orderError) {
        console.log(orderError);

        Alert.alert(
          'Error',
          'Failed to create your order.'
        );

        return;
      }

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

      const {
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.log(itemsError);

        Alert.alert(
          'Error',
          'Order was created, but the order items could not be saved.'
        );

        return;
      }

      Alert.alert(
        'Order Submitted',
        'Your order has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Main');
            },
          },
        ]
      );
    } catch (error) {
      console.log(error);

      Alert.alert(
        'Error',
        'Something went wrong while submitting your order.'
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
        <Text style={styles.title}>
          Review Order
        </Text>

        <Text style={styles.garmentName}>
          {orderData.garment.name}
        </Text>

        <Text style={styles.sectionTitle}>
          Selected Parts
        </Text>

        {orderData.items.map((item) => (
          <View
            key={item.partId}
            style={styles.card}
          >
            <Text style={styles.partName}>
              {item.partName}
            </Text>

            <Text style={styles.detail}>
              Design: {item.designName || 'None'}
            </Text>

            <Text style={styles.detail}>
              Fabric: {item.fabricName || 'None'}
            </Text>

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
          <MeasurementRow
            title="Shoulder"
            value={measurement.shoulder}
          />

          <MeasurementRow
            title="Chest / Bust"
            value={measurement.chest}
          />

          <MeasurementRow
            title="Waist"
            value={measurement.waist}
          />

          <MeasurementRow
            title="Sleeve Length"
            value={measurement.sleeve_length}
          />

          <MeasurementRow
            title="Top Length"
            value={measurement.top_length}
          />

          <MeasurementRow
            title="Hips"
            value={measurement.hips}
          />

          <MeasurementRow
            title="Inseam"
            value={measurement.inseam}
          />

          <MeasurementRow
            title="Bottom Length"
            value={measurement.bottom_length}
          />
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            Total Amount
          </Text>

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
            {submitting
              ? 'SUBMITTING...'
              : 'SUBMIT ORDER'}
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
      <Text style={styles.measurementName}>
        {title}
      </Text>

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
    marginBottom: 10,
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
