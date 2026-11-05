
import { useCallback, useEffect, useState } from 'react';

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

import { Ionicons } from '@expo/vector-icons';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../../../supabase';
import type { RootStackParamList } from '../../../navigator';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

type OrderType = 'catalog' | 'custom';

type OrderSummary = {
  total: number;
  deposit: number;
  balance: number;
};

type PaymentRecord = {
  id: string;
  status: string;
  payment_method?: string | null;
  transaction_id?: string | null;
};

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export default function PaymentScreen({ route, navigation }: Props) {
  const { orderId, orderType } = route.params as {
    orderId: string;
    orderType: OrderType;
    totalAmount?: number;
  };

  const { width } = useWindowDimensions();

  const horizontalPadding =
    width < 380 ? 14 : width < 600 ? 20 : 28;

  const [summary, setSummary] = useState<OrderSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(
    null,
  );

  const [pendingPaypalOrderId, setPendingPaypalOrderId] = useState<
    string | null
  >(null);

  const formatPrice = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const goToReceipt = (paymentId: string) => {
    navigation.replace('Receipt', {
      orderId,
      paymentId,
      orderType,
    });
  };

  const loadOrder = useCallback(async () => {
    let mounted = true;

    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
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
          throw new Error('Unable to find your catalog order.');
        }

        total = Number(order.total_amount);

        // Catalog orders use a 50% deposit.
        deposit = Math.round(total * 0.5 * 100) / 100;
      } else {
        const { data: order, error } = await supabase
          .from('custom_orders')
          .select('id, quoted_price, deposit_amount, status')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (error || !order) {
          throw new Error('Unable to find your custom order.');
        }

        if (order.status !== 'accepted') {
          throw new Error(
            'You can only pay after accepting the quotation.',
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
        throw new Error('The order payment amount is invalid.');
      }

      if (!mounted) return;

      setSummary({
        total,
        deposit,
        balance: total - deposit,
      });

      let paymentsQuery = supabase
        .from('payments')
        .select('id, status, payment_method, transaction_id')
        .eq('payment_type', 'deposit')
        .order('created_at', { ascending: false });

      paymentsQuery =
        orderType === 'catalog'
          ? paymentsQuery.eq('order_id', orderId)
          : paymentsQuery.eq('custom_order_id', orderId);

      const { data: payments, error: paymentsError } =
        await paymentsQuery;

      if (paymentsError) {
        throw paymentsError;
      }

      const paymentRecords = (payments || []) as PaymentRecord[];

      const paidPayment = paymentRecords.find(
        payment => payment.status === 'paid',
      );

      if (paidPayment) {
        goToReceipt(paidPayment.id);
        return;
      }

      const pendingPayment = paymentRecords.find(
        payment => payment.status === 'pending',
      );

      if (pendingPayment) {
        setPendingPaymentId(pendingPayment.id);

        if (pendingPayment.payment_method === 'paypal') {
          setPendingPaypalOrderId(
            pendingPayment.transaction_id || null,
          );
        }
      }
    } catch (error: any) {
      console.error('Payment screen load error:', error);

      Alert.alert(
        'Unable to Load Payment',
        error.message || 'Something went wrong while loading your order.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, [orderId, orderType, navigation]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const cleanup = await loadOrder();

      if (!active && typeof cleanup === 'function') {
        cleanup();
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [loadOrder]);

  const verifyPayment = async (paymentId: string) => {
    if (checkingPayment) return;

    setCheckingPayment(true);

    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: payment, error } = await supabase
          .from('payments')
          .select('id, status')
          .eq('id', paymentId)
          .single();

        if (error) {
          throw error;
        }

        if (payment?.status === 'paid') {
          goToReceipt(payment.id);
          return;
        }

        if (
          payment?.status === 'failed' ||
          payment?.status === 'cancelled'
        ) {
          setPendingPaymentId(null);
          setPendingPaypalOrderId(null);

          Alert.alert(
            'Payment Not Completed',
            'Your payment was not successful. You can try again.',
          );

          return;
        }

        if (payment?.status !== 'pending') {
          throw new Error('Unable to verify the payment status.');
        }

        await wait(2000);
      }

      Alert.alert(
        'Payment Still Processing',
        'Your payment has not been confirmed yet. Please check again later. Do not make another payment while this one is pending.',
      );
    } catch (error: any) {
      console.error('Payment verification error:', error);

      Alert.alert(
        'Verification Error',
        error.message || 'Unable to verify your payment.',
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!pendingPaymentId) {
      Alert.alert('No Pending Payment', 'There is no payment to check.');
      return;
    }

    if (pendingPaypalOrderId) {
      try {
        setProcessing(true);

        const { data, error } = await supabase.functions.invoke(
          'capture-paypal-order',
          {
            body: {
              paypalOrderId: pendingPaypalOrderId,
            },
          },
        );

        if (error) throw error;

        if (data?.success) {
          setPendingPaymentId(null);
          setPendingPaypalOrderId(null);
          goToReceipt(pendingPaymentId);
          return;
        }

        Alert.alert(
          'Payment Not Confirmed',
          data?.message ||
            'PayPal has not confirmed your payment yet. Please try checking again later.',
        );
      } catch (error: any) {
        console.error('PayPal capture error:', error);

        Alert.alert(
          'Unable to Check Payment',
          error.message || 'Please try again later.',
        );
      } finally {
        setProcessing(false);
      }

      return;
    }

    await verifyPayment(pendingPaymentId);
  };

  const handleGCashPayment = async () => {
    if (processing || checkingPayment) return;

    if (pendingPaymentId) {
      await handleCheckPayment();
      return;
    }

    Alert.alert(
      'Confirm GCash Payment',
      `You are about to pay ${formatPrice(
        summary!.deposit,
      )} as your order deposit.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setProcessing(true);

              const appReturnUrl = Linking.createURL('payment-return');

              const { data, error } = await supabase.functions.invoke(
                'create-paymongo-checkout',
                {
                  body: {
                    orderId,
                    orderType,
                    appReturnUrl,
                  },
                },
              );

              if (error) throw error;

              if (!data?.checkoutUrl || !data?.paymentId) {
                throw new Error(
                  data?.message || 'Unable to create GCash checkout.',
                );
              }

              setPendingPaymentId(data.paymentId);

              await WebBrowser.openAuthSessionAsync(
                data.checkoutUrl,
                appReturnUrl,
              );

              await verifyPayment(data.paymentId);
            } catch (error: any) {
              console.error('GCash payment error:', error);

              Alert.alert(
                'GCash Payment Error',
                error.message ||
                  'Unable to start your GCash payment. Please try again.',
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handlePayPalPayment = async () => {
    if (processing || checkingPayment) return;

    if (pendingPaymentId) {
      await handleCheckPayment();
      return;
    }

    Alert.alert(
      'Confirm PayPal Payment',
      `You are about to pay ${formatPrice(
        summary!.deposit,
      )} as your order deposit.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setProcessing(true);

              const { data, error } = await supabase.functions.invoke(
                'create-paypal-order',
                {
                  body: {
                    orderId,
                    orderType,
                  },
                },
              );

              if (error) throw error;

              if (
                !data?.success ||
                !data?.paymentId ||
                !data?.paypalOrderId ||
                !data?.approvalUrl
              ) {
                throw new Error(
                  data?.message || 'Unable to create PayPal payment.',
                );
              }

              setPendingPaymentId(data.paymentId);
              setPendingPaypalOrderId(data.paypalOrderId);

              const result = await WebBrowser.openAuthSessionAsync(
                data.approvalUrl,
                'pinkblush://payment',
              );

              if (result.type !== 'success' || !result.url) {
                Alert.alert(
                  'Payment Pending',
                  'PayPal checkout was closed or has not returned confirmation. Use Check Payment Status before trying again.',
                );
                return;
              }

              const parsed = Linking.parse(result.url);
              const query = parsed.queryParams || {};

              const paymentResult = String(query.result || '');
              const returnedOrderId = String(query.orderId || '');

              if (
                paymentResult !== 'success' ||
                returnedOrderId !== data.paypalOrderId
              ) {
                Alert.alert(
                  'Payment Not Confirmed',
                  'PayPal did not return a successful payment confirmation. You can check the payment status later.',
                );
                return;
              }

              const { data: captureData, error: captureError } =
                await supabase.functions.invoke(
                  'capture-paypal-order',
                  {
                    body: {
                      paypalOrderId: data.paypalOrderId,
                    },
                  },
                );

              if (captureError) throw captureError;

              if (captureData?.success) {
                setPendingPaymentId(null);
                setPendingPaypalOrderId(null);
                goToReceipt(data.paymentId);
              } else {
                Alert.alert(
                  'Payment Pending',
                  captureData?.message ||
                    'PayPal has not confirmed your payment yet. Please check again later.',
                );
              }
            } catch (error: any) {
              console.error('PayPal payment error:', error);

              Alert.alert(
                'PayPal Payment Error',
                error.message ||
                  'Unable to complete PayPal payment. Please try again.',
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D96B8A" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  const isBusy = processing || checkingPayment;

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
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="wallet-outline"
              size={30}
              color="#D96B8A"
            />
          </View>

          <Text style={styles.title}>Pay Your Deposit</Text>

          <Text style={styles.subtitle}>
            Choose your preferred payment method to continue your order.
          </Text>
        </View>

        {pendingPaymentId && (
          <View style={styles.pendingNotice}>
            <Ionicons
              name="time-outline"
              size={22}
              color="#B7791F"
            />

            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingTitle}>
                Payment Awaiting Confirmation
              </Text>

              <Text style={styles.pendingDescription}>
                A payment has already been started for this order. Check its
                status before attempting another payment.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.referenceRow}>
            <Text style={styles.referenceLabel}>Order Reference</Text>

            <Text style={styles.referenceValue}>
              #{orderId.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Order Amount</Text>
            <Text style={styles.amountValue}>
              {formatPrice(summary.total)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Deposit to Pay</Text>
            <Text style={styles.depositValue}>
              {formatPrice(summary.deposit)}
            </Text>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Remaining Balance</Text>
            <Text style={styles.amountValue}>
              {formatPrice(summary.balance)}
            </Text>
          </View>

          <View style={styles.balanceNote}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#B84470"
            />

            <Text style={styles.balanceNoteText}>
              Your remaining balance will be paid at pickup.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        <TouchableOpacity
          style={[
            styles.paymentCard,
            isBusy && styles.disabledCard,
          ]}
          onPress={handleGCashPayment}
          disabled={isBusy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Pay deposit using GCash"
          accessibilityState={{ disabled: isBusy }}
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons name="phone-portrait" size={28} color="#0879D1" />
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>GCash</Text>

            <Text style={styles.paymentDescription}>
              Pay securely through GCash using PayMongo.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#999"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentCard,
            isBusy && styles.disabledCard,
          ]}
          onPress={handlePayPalPayment}
          disabled={isBusy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Pay deposit using PayPal"
          accessibilityState={{ disabled: isBusy }}
        >
          <View style={styles.paymentIconContainer}>
            <Ionicons name="logo-paypal" size={28} color="#003087" />
          </View>

          <View style={styles.paymentInfo}>
            <Text style={styles.paymentName}>PayPal</Text>

            <Text style={styles.paymentDescription}>
              Pay securely using your PayPal account.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#999"
          />
        </TouchableOpacity>

        {pendingPaymentId && (
          <TouchableOpacity
            style={[
              styles.checkButton,
              isBusy && styles.disabledButton,
            ]}
            onPress={handleCheckPayment}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={20}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.checkButtonText}>
              {isBusy ? 'Checking Payment...' : 'Check Payment Status'}
            </Text>
          </TouchableOpacity>
        )}

        {isBusy && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#D96B8A" />

            <Text style={styles.processingText}>
              {checkingPayment
                ? 'Verifying your payment...'
                : 'Processing your request...'}
            </Text>
          </View>
        )}

        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#57956A"
          />

          <Text style={styles.securityText}>
            Your payment will only be marked as paid after confirmation from
            the payment provider.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8FA',
  },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 35,
  },

  mainContent: {
    width: '100%',
    maxWidth: 650,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8FA',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#777',
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },

  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FCE7EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 13,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 7,
    maxWidth: 400,
  },

  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF4DD',
    borderRadius: 13,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F3D99D',
  },

  pendingTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  pendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A5A12',
  },

  pendingDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A6A36',
    marginTop: 4,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 19,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#F3E4E9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#333',
    marginBottom: 15,
  },

  referenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },

  referenceLabel: {
    fontSize: 13,
    color: '#888',
  },

  referenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B84470',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0E6E9',
    marginBottom: 14,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 13,
  },

  amountLabel: {
    flex: 1,
    fontSize: 13,
    color: '#777',
  },

  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    textAlign: 'right',
  },

  depositValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D96B8A',
    textAlign: 'right',
  },

  balanceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F5',
    borderRadius: 10,
    padding: 11,
    marginTop: 5,
  },

  balanceNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#A34D6A',
    lineHeight: 18,
    marginLeft: 7,
  },

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#F0E1E7',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
  },

  disabledCard: {
    opacity: 0.55,
  },

  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  paymentInfo: {
    flex: 1,
    marginHorizontal: 13,
  },

  paymentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333',
  },

  paymentDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
    marginTop: 4,
  },

  checkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B84470',
    borderRadius: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginTop: 7,
    gap: 9,
  },

  disabledButton: {
    opacity: 0.65,
  },

  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
    gap: 9,
  },

  processingText: {
    fontSize: 13,
    color: '#888',
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
    gap: 8,
  },

  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
});
