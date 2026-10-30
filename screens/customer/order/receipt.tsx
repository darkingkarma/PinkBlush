
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../../../supabase';
import type { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Receipt'>;

type OrderInfo = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string | null;
};

type PaymentInfo = {
  id: string;
  payment_type: string;
  payment_method: string;
  amount: number;
  status: string;
  transaction_id: string | null;
  paid_at: string | null;
};

export default function ReceiptScreen({ route, navigation }: Props) {
  const { orderId, paymentId, orderType } = route.params;

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const formatPrice = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const loadReceipt = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Please log in to view your receipt.');
      }

      let orderData: OrderInfo | null = null;
      let paymentData: PaymentInfo | null = null;

      if (orderType === 'catalog') {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .eq('id', orderId)
          .eq('customer_id', user.id)
          .single();

        if (error || !data) {
          throw new Error(
            'Catalog order not found or you do not have permission to view it.'
          );
        }

        orderData = {
          id: data.id,
          status: data.status,
          total_amount: Number(data.total_amount),
          created_at: data.created_at,
        };

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select(
            'id, payment_type, payment_method, amount, status, transaction_id, paid_at'
          )
          .eq('id', paymentId)
          .eq('order_id', orderId)
          .single();

        if (paymentError || !payment) {
          throw new Error('Catalog payment record could not be found.');
        }

        paymentData = {
          ...payment,
          amount: Number(payment.amount),
        };
      } else {
        const { data, error } = await supabase
          .from('custom_orders')
          .select('id, status, quoted_price, created_at')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          throw new Error(
            'Custom order not found or you do not have permission to view it.'
          );
        }

        orderData = {
          id: data.id,
          status: data.status,
          total_amount: Number(data.quoted_price),
          created_at: data.created_at,
        };

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select(
            'id, payment_type, payment_method, amount, status, transaction_id, paid_at'
          )
          .eq('id', paymentId)
          .eq('custom_order_id', orderId)
          .single();

        if (paymentError || !payment) {
          throw new Error('Custom order payment record could not be found.');
        }

        paymentData = {
          ...payment,
          amount: Number(payment.amount),
        };
      }

      setOrder(orderData);
      setPayment(paymentData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to load the receipt.';

      Alert.alert('Receipt Error', message, [
        {
          text: 'Go to My Orders',
          onPress: () => navigation.navigate('Main'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [orderId, paymentId, orderType, navigation]);

  useEffect(() => {
    void loadReceipt();
  }, [loadReceipt]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B84470" />
        <Text style={styles.loadingText}>
          Loading your receipt...
        </Text>
      </View>
    );
  }

  if (!order || !payment) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="receipt-outline" size={48} color="#B84470" />

        <Text style={styles.emptyTitle}>
          Receipt unavailable
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.primaryButtonText}>
            Return to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = Number(order.total_amount);
  const amountPaid = payment.status === 'paid' ? Number(payment.amount) : 0;
  const remaining = Math.max(0, total - amountPaid);

  const isPaid = payment.status === 'paid';

  const methodName =
    payment.payment_method === 'gcash'
      ? 'GCash'
      : payment.payment_method === 'paypal'
        ? 'PayPal'
        : payment.payment_method;

  const paymentType =
    payment.payment_type.charAt(0).toUpperCase() +
    payment.payment_type.slice(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.receiptCard}>
        {/* BRAND */}

        <View style={styles.brandHeader}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="shirt-outline"
              size={30}
              color="#B84470"
            />
          </View>

          <Text style={styles.brandName}>
            PINK BLUSH
          </Text>

          <Text style={styles.brandSubtitle}>
            Official Payment Receipt
          </Text>
        </View>

        {/* PAYMENT STATUS */}

        <View style={styles.successIcon}>
          <Ionicons
            name={isPaid ? 'checkmark-circle' : 'time-outline'}
            size={58}
            color={isPaid ? '#27865A' : '#C58A25'}
          />
        </View>

        <Text style={styles.receiptTitle}>
          {isPaid ? 'Payment Successful!' : 'Payment Pending'}
        </Text>

        <Text style={styles.receiptSubtitle}>
          {isPaid
            ? 'Your payment has been successfully confirmed.'
            : 'Your transaction is awaiting payment confirmation.'}
        </Text>

        {/* ORDER REFERENCE */}

        <View style={styles.referenceBox}>
          <Text style={styles.mutedText}>
            ORDER REFERENCE
          </Text>

          <Text style={styles.orderReference}>
            #{order.id.slice(0, 8).toUpperCase()}
          </Text>

          <Text style={styles.dateText}>
            {order.created_at
              ? new Date(order.created_at).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Date unavailable'}
          </Text>

          <Text style={styles.orderType}>
            {orderType === 'custom' ? 'Custom Order' : 'Catalog Order'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* PAYMENT DETAILS */}

        <Text style={styles.sectionTitle}>
          Payment Details
        </Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Payment Method
          </Text>

          <Text style={styles.detailValue}>
            {methodName}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Payment Type
          </Text>

          <Text style={styles.detailValue}>
            {paymentType}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Payment Status
          </Text>

          <Text
            style={[
              styles.statusText,
              { color: isPaid ? '#27865A' : '#C58A25' },
            ]}
          >
            {payment.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Transaction Reference
          </Text>

          <Text style={styles.transactionText}>
            {payment.transaction_id || 'Not available'}
          </Text>
        </View>

        {payment.paid_at && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Payment Date
            </Text>

            <Text style={styles.detailValue}>
              {new Date(payment.paid_at).toLocaleString('en-PH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* ORDER SUMMARY */}

        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Total Order Price
          </Text>

          <Text style={styles.detailValue}>
            {formatPrice(total)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Amount Paid
          </Text>

          <Text style={styles.depositValue}>
            {formatPrice(amountPaid)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            Remaining Balance
          </Text>

          <Text style={styles.detailValue}>
            {formatPrice(remaining)}
          </Text>
        </View>

        {/* BALANCE */}

        <View style={styles.balanceBox}>
          <Ionicons
            name="wallet-outline"
            size={22}
            color="#B84470"
          />

          <View style={styles.balanceInfo}>
            <Text style={styles.balanceTitle}>
              Remaining Balance
            </Text>

            <Text style={styles.balanceAmount}>
              {formatPrice(remaining)}
            </Text>

            <Text style={styles.balanceNote}>
              Payable according to your order's payment arrangement.
            </Text>
          </View>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Ionicons name="heart" size={16} color="#B84470" />

          <Text style={styles.footerText}>
            Thank you for choosing Pink Blush!
          </Text>
        </View>
      </View>

      {/* ACTIONS */}

      {!isPaid && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => void loadReceipt()}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color="#B84470"
          />

          <Text style={styles.secondaryButtonText}>
            Refresh Payment Status
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Main')}
      >
        <Ionicons
          name="home-outline"
          size={20}
          color="#FFFFFF"
        />

        <Text style={styles.primaryButtonText}>
          Return to Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('MyOrders')}
      >
        <Ionicons
          name="receipt-outline"
          size={20}
          color="#B84470"
        />

        <Text style={styles.secondaryButtonText}>
          View My Orders
        </Text>
      </TouchableOpacity>

      <Text style={styles.bottomNote}>
        Thank you for your transaction with Pink Blush.
        Please keep this receipt for your records.
      </Text>
    </ScrollView>
  );
}

// =========================================
// STYLES
// =========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7FA',
  },

  content: {
    padding: 18,
    paddingBottom: 35,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7FA',
    padding: 24,
  },

  loadingText: {
    color: '#816875',
    marginTop: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B2430',
    marginVertical: 16,
  },

  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1D9E2',
  },

  brandHeader: {
    alignItems: 'center',
  },

  brandIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FCE4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  brandName: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#B84470',
  },

  brandSubtitle: {
    fontSize: 13,
    color: '#816875',
    marginTop: 5,
  },

  successIcon: {
    alignItems: 'center',
    marginTop: 24,
  },

  receiptTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3B2430',
    textAlign: 'center',
    marginTop: 8,
  },

  receiptSubtitle: {
    color: '#816875',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 7,
    marginBottom: 18,
  },

  referenceBox: {
    alignItems: 'center',
    paddingVertical: 22,
  },

  mutedText: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#816875',
  },

  orderReference: {
    fontSize: 25,
    fontWeight: '900',
    color: '#B84470',
    marginTop: 7,
  },

  dateText: {
    fontSize: 12,
    color: '#816875',
    marginTop: 8,
    textAlign: 'center',
  },

  orderType: {
    fontSize: 12,
    color: '#816875',
    marginTop: 6,
    fontWeight: '600',
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E3E9',
    marginVertical: 17,
    borderStyle: 'dashed',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B2430',
    marginBottom: 15,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 15,
  },

  detailLabel: {
    flex: 1,
    fontSize: 12,
    color: '#816875',
  },

  detailValue: {
    flex: 1,
    fontSize: 12,
    color: '#3B2430',
    fontWeight: '700',
    textAlign: 'right',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },

  transactionText: {
    flex: 1,
    fontSize: 10,
    color: '#3B2430',
    fontWeight: '600',
    textAlign: 'right',
  },

  depositValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B84470',
  },

  balanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },

  balanceInfo: {
    flex: 1,
  },

  balanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#816875',
  },

  balanceAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#B84470',
    marginTop: 5,
  },

  balanceNote: {
    fontSize: 11,
    lineHeight: 16,
    color: '#816875',
    marginTop: 5,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 25,
  },

  footerText: {
    fontSize: 12,
    color: '#816875',
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#B84470',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 18,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B84470',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },

  secondaryButtonText: {
    color: '#B84470',
    fontSize: 14,
    fontWeight: '800',
  },

  bottomNote: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: '#816875',
    marginTop: 15,
  },
});
