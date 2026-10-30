
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigator';

import { supabase } from '../../../supabase';

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

  const formatPrice = (value: number) => {
    return `₱${Number(value || 0).toFixed(2)}`;
  };

  const totalAmount = Number(orderData.totalAmount || 0);

  const depositAmount = totalAmount * 0.5;

  const remainingBalance = totalAmount - depositAmount;

  const handleSubmitOrder = async () => {
    if (submitting) return;

    if (!orderData.items || orderData.items.length === 0) {
      Alert.alert(
        'Invalid Order',
        'Please select at least one garment part.'
      );
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
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      Alert.alert(
        'Invalid Total',
        'Please check your order total.'
      );
      return;
    }

    const invalidItem = orderData.items.some(
      (item) =>
        !item.partId ||
        !item.designId ||
        !item.fabricId ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(Number(item.unitPrice)) ||
        !Number.isFinite(Number(item.subtotal))
    );

    if (invalidItem) {
      Alert.alert(
        'Incomplete Order',
        'One or more garment parts have missing design, fabric, quantity, or price information.'
      );
      return;
    }

    Alert.alert(
      'Confirm Your Order',
      'Please make sure your selected garment parts, designs, fabrics, quantities, and measurements are correct before confirming.\n\nDo you want to proceed with this order?',
      [
        {
          text: 'Review Again',
          style: 'cancel',
        },
        {
          text: 'Confirm Order',
          onPress: () => {
            void createOrder();
          },
        },
      ]
    );
  };

  const createOrder = async () => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Login Required',
          'Please log in before submitting your order.'
        );
        return;
      }

      // 1. Create the catalog order.
      const {
        data: order,
        error: orderError,
      } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          measurement_id: measurement.id,
          status: 'pending',
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error(
          'Order creation failed:',
          orderError
        );

        Alert.alert(
          'Submission Failed',
          'Your order could not be created. Please try again.'
        );

        return;
      }

      // 2. Save the selected garment parts and options.
      const orderItems = orderData.items.map((item) => ({
        order_id: order.id,
        garment_id: orderData.garment.id,
        garment_part_id: item.partId,
        design_id: item.designId,
        fabric_id: item.fabricId,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      }));

      const {
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error(
          'Order items insertion failed:',
          itemsError
        );

        // Remove the incomplete order if saving its items fails.
        const {
          error: rollbackError,
        } = await supabase
          .from('orders')
          .delete()
          .eq('id', order.id)
          .eq('customer_id', user.id);

        if (rollbackError) {
          console.error(
            'Order cleanup failed:',
            rollbackError
          );

          Alert.alert(
            'Order Needs Attention',
            'The order was created, but its items could not be saved. Please contact staff before submitting another order.'
          );
        } else {
          Alert.alert(
            'Submission Failed',
            'Your order items could not be saved. The incomplete order was removed. Please try again.'
          );
        }

        return;
      }

      // 3. Proceed to the payment screen.
      // Payment is not automatically marked as paid here.
      navigation.replace('Payment', {
        orderId: order.id,
        orderType: 'catalog',
        totalAmount: Number(order.total_amount),
      });

    } catch (error) {
      console.error(
        'Unexpected submission error:',
        error
      );

      Alert.alert(
        'Error',
        'Something went wrong while submitting your order. Please check My Orders before trying again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const editMeasurements = () => {
    navigation.navigate('OrderMeasurements', {
      orderData: orderData,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Review Order
          </Text>

          <Text style={styles.subtitle}>
            Check your order details before confirming.
          </Text>
        </View>

        {/* GARMENT */}
        <View style={styles.garmentHeader}>
          <Text style={styles.garmentLabel}>
            SELECTED GARMENT
          </Text>

          <Text style={styles.garmentName}>
            {orderData.garment.name}
          </Text>
        </View>

        {/* SELECTED PARTS */}
        <Text style={styles.sectionTitle}>
          Order Items
        </Text>

        {orderData.items.map((item) => (
          <View
            key={item.partId}
            style={styles.card}
          >
            <Text style={styles.partName}>
              {item.partName}
            </Text>

            <View style={styles.divider} />

            {/* DESIGN */}
            <Text style={styles.detailLabel}>
              Selected Design
            </Text>

            {item.designImage ? (
              <Image
                source={{
                  uri: item.designImage,
                }}
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

            {/* FABRIC */}
            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>
                Selected Fabric
              </Text>

              <Text style={styles.detailValue}>
                {item.fabricName || 'None selected'}
              </Text>
            </View>

            {/* QUANTITY AND PRICE */}
            <View style={styles.priceDetails}>
              <View style={styles.priceRow}>
                <Text style={styles.detailText}>
                  Quantity
                </Text>

                <Text style={styles.detailValue}>
                  {item.quantity}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.detailText}>
                  Unit Price
                </Text>

                <Text style={styles.detailValue}>
                  {formatPrice(item.unitPrice)}
                </Text>
              </View>
            </View>

            {/* SUBTOTAL */}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>
                Subtotal
              </Text>

              <Text style={styles.subtotal}>
                {formatPrice(item.subtotal)}
              </Text>
            </View>
          </View>
        ))}

        {/* MEASUREMENTS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Your Measurements
          </Text>

          <TouchableOpacity
            onPress={editMeasurements}
            disabled={submitting}
          >
            <Text style={styles.editText}>
              EDIT
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.measurementCategory}>
            Upper Body
          </Text>

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

          <View style={styles.measurementDivider} />

          <Text style={styles.measurementCategory}>
            Lower Body
          </Text>

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

        {/* ORDER TOTAL */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            Order Total
          </Text>

          <Text style={styles.totalAmount}>
            {formatPrice(totalAmount)}
          </Text>
        </View>

        {/* PAYMENT SUMMARY */}
        <View style={styles.depositBox}>
          <Text style={styles.depositTitle}>
            Payment Summary
          </Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Required Deposit (50%)
            </Text>

            <Text style={styles.depositAmount}>
              {formatPrice(depositAmount)}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              Remaining Balance
            </Text>

            <Text style={styles.balanceAmount}>
              {formatPrice(remainingBalance)}
            </Text>
          </View>

          <View style={styles.depositDivider} />

          <Text style={styles.depositNote}>
            A 50% deposit is required to proceed with your order. You will be taken to the payment screen after confirming.
          </Text>
        </View>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              CONFIRM ORDER
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          Please review your order carefully before confirming.
        </Text>
      </ScrollView>
    </View>
  );
}

// MEASUREMENT ROW
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
          : `${value} cm`}
      </Text>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  header: {
    marginTop: 15,
    marginBottom: 25,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
  },

  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },

  garmentHeader: {
    backgroundColor: '#FDF1F5',
    borderRadius: 12,
    padding: 17,
    marginBottom: 25,
  },

  garmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },

  garmentName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#D96B8A',
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#333',
    marginBottom: 13,
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1E4E9',
    borderRadius: 13,
    padding: 16,
    marginBottom: 22,
  },

  partName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#D96B8A',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1E4E9',
    marginVertical: 13,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    marginBottom: 8,
  },

  designImage: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    backgroundColor: '#F7F0F3',
  },

  designPlaceholder: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#FDF1F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    color: '#999',
    fontSize: 13,
  },

  designName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D96B8A',
    marginTop: 9,
    marginBottom: 17,
  },

  detailGroup: {
    marginBottom: 15,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
  },

  priceDetails: {
    backgroundColor: '#FFF8FA',
    borderRadius: 9,
    padding: 12,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  detailText: {
    fontSize: 14,
    color: '#777',
  },

  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1E4E9',
    marginTop: 15,
    paddingTop: 14,
  },

  subtotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },

  subtotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D96B8A',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  editText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D96B8A',
    marginBottom: 13,
  },

  measurementCategory: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D96B8A',
    marginBottom: 5,
    marginTop: 5,
  },

  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EDF0',
  },

  measurementName: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },

  measurementValue: {
    fontSize: 14,
    color: '#D96B8A',
    fontWeight: '700',
  },

  measurementDivider: {
    height: 1,
    backgroundColor: '#F1E4E9',
    marginVertical: 13,
  },

  totalBox: {
    backgroundColor: '#FDF1F5',
    borderRadius: 12,
    padding: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
  },

  totalAmount: {
    fontSize: 23,
    fontWeight: '800',
    color: '#D96B8A',
  },

  depositBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1D9E0',
    borderRadius: 12,
    padding: 17,
    marginTop: 15,
  },

  depositTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
    marginBottom: 13,
  },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 7,
  },

  paymentLabel: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
    flex: 1,
  },

  depositAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D96B8A',
  },

  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#444',
  },

  depositDivider: {
    height: 1,
    backgroundColor: '#F1E4E9',
    marginVertical: 12,
  },

  depositNote: {
    fontSize: 12,
    color: '#888',
    lineHeight: 19,
  },

  submitButton: {
    backgroundColor: '#D96B8A',
    paddingVertical: 17,
    paddingHorizontal: 15,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 22,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  bottomNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 13,
  },
});
