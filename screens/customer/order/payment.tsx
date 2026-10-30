
import { useEffect, useState } from 'react';

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
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../../../supabase';
import type { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

type OrderSummary = {
  total: number;
  deposit: number;
  balance: number;
};

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

export default function PaymentScreen({ route, navigation }: Props) {
  const { orderId, orderType } = route.params;

  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(
    null
  );

  const formatPrice = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // =========================================
  // LOAD ORDER AND CHECK EXISTING PAYMENT
  // =========================================

  useEffect(() => {
    let mounted = true;

    const loadOrder = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('Please log in again to continue.');
        }

        let total = 0;
        let deposit = 0;

        if (orderType === 'catalog') {
          const { data: order, error } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('id', orderId)
            .eq('customer_id', user.id)
            .single();

          if (error || !order) {
            throw new Error('Catalog order could not be found.');
          }

          total = Number(order.total_amount);
          deposit = Math.round(total * 0.5 * 100) / 100;
        } else {
          const { data: order, error } = await supabase
            .from('custom_orders')
            .select('id, quoted_price, deposit_amount, status')
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single();

          if (error || !order) {
            throw new Error('Custom order could not be found.');
          }

          if (order.status !== 'accepted') {
            throw new Error(
              'You must accept the quotation before paying the deposit.'
            );
          }

          total = Number(order.quoted_price);
          deposit = Number(order.deposit_amount);
        }

        if (
          !Number.isFinite(total) ||
          !Number.isFinite(deposit) ||
          total <= 0 ||
          deposit <= 0 ||
          deposit > total
        ) {
          throw new Error('The order has an invalid price or deposit.');
        }

        if (!mounted) return;

        setSummary({
          total,
          deposit,
          balance: Math.round((total - deposit) * 100) / 100,
        });

        // Check whether this deposit has already been paid.
        let paidQuery = supabase
          .from('payments')
          .select('id')
          .eq('payment_type', 'deposit')
          .eq('status', 'paid');

        paidQuery = orderType === 'catalog'
          ? paidQuery.eq('order_id', orderId)
          : paidQuery.eq('custom_order_id', orderId);

        const { data: paidPayment, error: paidError } = await paidQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paidError) {
          throw new Error('Unable to check your previous payment.');
        }

        if (!mounted) return;

        if (paidPayment) {
          navigation.replace('Receipt', {
            orderId,
            paymentId: paidPayment.id,
            orderType,
          });
          return;
        }

        // Find an existing pending deposit.
        let pendingQuery = supabase
          .from('payments')
          .select('id')
          .eq('payment_type', 'deposit')
          .eq('status', 'pending');

        pendingQuery = orderType === 'catalog'
          ? pendingQuery.eq('order_id', orderId)
          : pendingQuery.eq('custom_order_id', orderId);

        const { data: pendingPayment, error: pendingError } =
          await pendingQuery
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (pendingError) {
          throw new Error('Unable to check pending payments.');
        }

        if (mounted && pendingPayment) {
          setPendingPaymentId(pendingPayment.id);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load your order.';

        Alert.alert('Order Error', message, [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      mounted = false;
    };
  }, [orderId, orderType, navigation]);

  // =========================================
  // VERIFY PAYMENT THROUGH DATABASE
  // =========================================

  const verifyPayment = async (paymentId: string) => {
    if (checkingPayment) return;

    setCheckingPayment(true);

    try {
      // Allow the webhook time to process the payment.
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: payment, error } = await supabase
          .from('payments')
          .select('id, status')
          .eq('id', paymentId)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Unable to check payment status. Please try again.'
          );
        }

        if (!payment) {
          throw new Error('Payment record could not be found.');
        }

        if (payment.status === 'paid') {
          setPendingPaymentId(null);

          navigation.replace('Receipt', {
            orderId,
            paymentId: payment.id,
            orderType,
          });

          return;
        }

        if (payment.status === 'failed') {
          setPendingPaymentId(null);

          Alert.alert(
            'Payment Failed',
            'Your payment was not completed. You can start a new checkout.'
          );

          return;
        }

        if (payment.status !== 'pending') {
          throw new Error('The payment has an unexpected status.');
        }

        await wait(2000);
      }

      // Keep the payment reference so the customer can check again.
      setPendingPaymentId(paymentId);

      Alert.alert(
        'Payment Still Processing',
        'Your payment has not yet been confirmed. Please check again shortly. Do not create another payment while this one is pending.'
      );
    } catch (error) {
      Alert.alert(
        'Verification Error',
        error instanceof Error
          ? error.message
          : 'Unable to verify your payment.'
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  // =========================================
  // CHECK EXISTING PENDING PAYMENT
  // =========================================

  const handleCheckPayment = async () => {
    if (!pendingPaymentId || checkingPayment || processing) return;

    await verifyPayment(pendingPaymentId);
  };

  // =========================================
  // START GCASH CHECKOUT
  // =========================================

  const handleGCashPayment = () => {
    if (processing || checkingPayment || !summary) return;

    // Never create another checkout while one is pending.
    if (pendingPaymentId) {
      void handleCheckPayment();
      return;
    }

    Alert.alert(
      'Confirm Deposit',
      `Continue to pay ${formatPrice(summary.deposit)} through GCash?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: async () => {
            setProcessing(true);

            try {
              const appReturnUrl = Linking.createURL('payment-return');

              const { data, error } =
                await supabase.functions.invoke(
                  'create-paymongo-checkout',
                  {
                    body: {
                      orderId,
                      orderType,
                      appReturnUrl,
                    },
                  }
                );

              if (error) {
                throw new Error(
                  data?.error ||
                    error.message ||
                    'Unable to create checkout.'
                );
              }

              if (!data?.checkoutUrl || !data?.paymentId) {
                throw new Error(
                  data?.error ||
                    'Checkout details were not returned.'
                );
              }

              // Save the payment reference immediately.
              setPendingPaymentId(data.paymentId);

              // Open PayMongo checkout.
              await WebBrowser.openAuthSessionAsync(
                data.checkoutUrl,
                appReturnUrl
              );

              // A browser return does not prove payment.
              // The database status is the source of truth.
              await verifyPayment(data.paymentId);
            } catch (error) {
              Alert.alert(
                'Checkout Error',
                error instanceof Error
                  ? error.message
                  : 'Something went wrong. Please try again.'
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B84470" />
        <Text style={styles.loadingText}>
          Loading order details...
        </Text>
      </View>
    );
  }

  // =========================================
  // SCREEN
  // =========================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >   

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="wallet-outline" size={30} color="#B84470" />
        </View>

        <Text style={styles.title}>Pay Your Deposit</Text>

        <Text style={styles.subtitle}>
          Pay your deposit to continue with your garment order.
        </Text>
      </View>

      {pendingPaymentId && (
        <View style={styles.pendingNotice}>
          <Ionicons
            name="time-outline"
            size={23}
            color="#9A5B12"
          />

          <View style={styles.noticeTextContainer}>
            <Text style={styles.pendingTitle}>
              Payment Awaiting Confirmation
            </Text>

            <Text style={styles.pendingText}>
              A payment for this order is already pending. Check its
              status before attempting another payment.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Summary</Text>

        <View style={styles.orderReference}>
          <Text style={styles.mutedText}>Order Reference</Text>

          <Text style={styles.reference}>
            #{orderId.slice(0, 8).toUpperCase()}
          </Text>

          <Text style={styles.orderType}>
            {orderType === 'custom' ? 'Custom Order' : 'Catalog Order'}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.mutedText}>Total Order Price</Text>

          <Text style={styles.amount}>
            {formatPrice(summary.total)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.depositLabel}>Deposit Due</Text>

          <Text style={styles.depositAmount}>
            {formatPrice(summary.deposit)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.mutedText}>Remaining Balance</Text>

          <Text style={styles.amount}>
            {formatPrice(summary.balance)}
          </Text>
        </View>

        <Text style={styles.balanceNote}>
          The remaining balance is intended to be paid in cash at pickup.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Payment Method</Text>

      <View style={[styles.methodCard, styles.selectedMethod]}>
        <View style={[styles.methodIcon, styles.gcashIcon]}>
          <Ionicons
            name="phone-portrait-outline"
            size={26}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.methodInfo}>
          <Text style={styles.methodName}>GCash</Text>

          <Text style={styles.methodDescription}>
            Pay securely through PayMongo checkout.
          </Text>
        </View>

        <Ionicons
          name="checkmark-circle"
          size={23}
          color="#B84470"
        />
      </View>

      <TouchableOpacity
        style={[
          styles.payButton,
          (processing || checkingPayment) && styles.disabledButton,
        ]}
        onPress={
          pendingPaymentId
            ? handleCheckPayment
            : handleGCashPayment
        }
        disabled={processing || checkingPayment}
        activeOpacity={0.85}
      >
        {processing || checkingPayment ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={
                pendingPaymentId
                  ? 'refresh-circle-outline'
                  : 'shield-checkmark-outline'
              }
              size={21}
              color="#FFFFFF"
            />

            <Text style={styles.payButtonText}>
              {pendingPaymentId
                ? 'Check Payment Status'
                : 'Continue to GCash'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {(processing || checkingPayment) && (
        <View style={styles.checkingContainer}>
          <ActivityIndicator size="small" color="#B84470" />

          <Text style={styles.checkingText}>
            {processing
              ? 'Opening secure checkout...'
              : 'Verifying your payment...'}
          </Text>
        </View>
      )}

      <Text style={styles.footerNote}>
        Your payment will only be recorded as paid after PayMongo
        confirms it through the payment notification system.
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
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7FA',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#816875',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 12,
  },

  backText: {
    marginLeft: 6,
    color: '#B84470',
    fontSize: 15,
    fontWeight: '600',
  },

  header: {
    alignItems: 'center',
    marginBottom: 22,
  },

  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCE4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#3B2430',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#816875',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },

  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1D6',
    borderColor: '#F4D69A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 20,
  },

  noticeTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  pendingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#87520C',
    marginBottom: 4,
  },

  pendingText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#87520C',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3DCE5',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3B2430',
    marginBottom: 14,
  },

  orderReference: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E7EC',
  },

  mutedText: {
    fontSize: 13,
    color: '#816875',
  },

  reference: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B84470',
    marginTop: 5,
  },

  orderType: {
    fontSize: 12,
    color: '#816875',
    marginTop: 4,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 12,
  },

  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B2430',
  },

  depositLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B84470',
    flex: 1,
  },

  depositAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B84470',
  },

  balanceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#816875',
    backgroundColor: '#FFF7FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 2,
  },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0DCE4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  selectedMethod: {
    borderColor: '#B84470',
    backgroundColor: '#FFF0F5',
  },

  methodIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gcashIcon: {
    backgroundColor: '#007DFE',
  },

  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },

  methodName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B2430',
  },

  methodDescription: {
    fontSize: 12,
    color: '#816875',
    marginTop: 4,
  },

  payButton: {
    backgroundColor: '#B84470',
    borderRadius: 13,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 9,
  },

  disabledButton: {
    opacity: 0.65,
  },

  payButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 9,
  },

  checkingText: {
    fontSize: 13,
    color: '#816875',
  },

  footerNote: {
    fontSize: 11,
    lineHeight: 17,
    color: '#816875',
    textAlign: 'center',
    marginTop: 14,
  },
});
