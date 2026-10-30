
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../../supabase';
import { RootStackParamList } from '../../navigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ReviewQuotation'
>;

type CustomOrder = {
  id: string;
  garment_description: string;
  status: string;
  quoted_price: number | string | null;
  deposit_amount: number | string | null;
  estimated_completion_date: string | null;
  quotation_note: string | null;
  decline_reason: string | null;
  created_at: string;
};

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';

export default function ReviewQuotationScreen({
  route,
  navigation,
}: Props) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<CustomOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        Alert.alert('Session expired', 'Please log in again.');
        navigation.goBack();
        return;
      }

      const { data, error } = await supabase
        .from('custom_orders')
        .select(
          'id, garment_description, status, quoted_price, deposit_amount, estimated_completion_date, quotation_note, decline_reason, created_at'
        )
        .eq('id', orderId)
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert('Not found', 'This order could not be found.');
        navigation.goBack();
        return;
      }

      setOrder(data as CustomOrder);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Unable to load the quotation.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [orderId]);

  const quotedPrice = Number(order?.quoted_price ?? 0);
  const depositAmount = Number(order?.deposit_amount ?? 0);
  const remainingBalance = Math.max(0, quotedPrice - depositAmount);

  const formatPrice = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string | null) => {
    if (!date) return 'Not specified';

    const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) return 'Not specified';

    return parsedDate.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const respondToQuotation = (decision: 'accepted' | 'declined') => {
    if (!order || saving) return;

    if (
      !['quoted', 'quotation_sent'].includes(order.status) ||
      order.quoted_price === null ||
      !Number.isFinite(quotedPrice) ||
      quotedPrice <= 0 ||
      !Number.isFinite(depositAmount) ||
      depositAmount < 0 ||
      depositAmount > quotedPrice
    ) {
      Alert.alert(
        'Quotation unavailable',
        'This quotation is no longer available or its price details are invalid.'
      );
      return;
    }

    const isAccepting = decision === 'accepted';

    Alert.alert(
      isAccepting ? 'Accept Quotation?' : 'Decline Quotation?',
      isAccepting
        ? 'Do you agree to the quoted price and terms? You will proceed to deposit payment after accepting.'
        : 'Are you sure you want to decline this quotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAccepting ? 'Accept' : 'Decline',
          style: isAccepting ? 'default' : 'destructive',
          onPress: async () => {
            setSaving(true);

            try {
              const { data: userData, error: userError } =
                await supabase.auth.getUser();

              if (userError || !userData.user) {
                throw new Error('Please log in again.');
              }

              const { data, error } = await supabase
                .from('custom_orders')
                .update({ status: decision })
                .eq('id', order.id)
                .eq('user_id', userData.user.id)
                .in('status', ['quoted', 'quotation_sent'])
                .select('id')
                .maybeSingle();

              if (error) throw error;

              if (!data) {
                Alert.alert(
                  'Quotation updated',
                  'This quotation may already have been responded to. Please refresh your orders.'
                );
                await fetchQuotation();
                return;
              }

              setOrder({ ...order, status: decision });

              if (isAccepting) {
                navigation.replace('Payment', {
                  orderId: order.id,
                  orderType: 'custom',
                  totalAmount: quotedPrice,
                });
                return;
              }

              Alert.alert(
                'Quotation Declined',
                'You declined the quotation.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Unable to update',
                error?.message ||
                  'Something went wrong. Please try again.'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>Loading quotation...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Ionicons name="document-text-outline" size={48} color={PINK} />
        <Text style={styles.emptyTitle}>Quotation unavailable</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quotationIsOpen = ['quoted', 'quotation_sent'].includes(
    order.status
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={30} color={PINK} />
        </View>
        <Text style={styles.title}>Review Quotation</Text>
        <Text style={styles.subtitle}>
          Review your tailor's quotation before making a decision.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Details</Text>

        <Text style={styles.label}>Garment / Request</Text>
        <Text style={styles.description}>
          {order.garment_description || 'Custom garment request'}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Order submitted</Text>
        <Text style={styles.value}>
          {formatDate(order.created_at)}
        </Text>

        <Text style={styles.label}>Estimated completion date</Text>
        <Text style={styles.value}>
          {formatDate(order.estimated_completion_date)}
        </Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceHeading}>Quotation Summary</Text>

        <Text style={styles.label}>Total quoted price</Text>
        <Text style={styles.totalPrice}>
          {formatPrice(quotedPrice)}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Required deposit</Text>
          <Text style={styles.priceValue}>
            {formatPrice(depositAmount)}
          </Text>
        </View>

        <View style={styles.priceDivider} />

        <View style={styles.priceRow}>
          <Text style={styles.balanceLabel}>Remaining balance</Text>
          <Text style={styles.balanceValue}>
            {formatPrice(remainingBalance)}
          </Text>
        </View>

        <Text style={styles.paymentNote}>
          The remaining balance is an estimate after the deposit.
          No payment has been made by accepting this quotation.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tailor's Note</Text>
        <Text style={styles.noteText}>
          {order.quotation_note?.trim() ||
            'No additional note was provided by the tailor.'}
        </Text>
      </View>

      {!quotationIsOpen && (
        <View style={styles.statusCard}>
          <Ionicons
            name={
              order.status === 'accepted'
                ? 'checkmark-circle'
                : 'information-circle'
            }
            size={25}
            color={order.status === 'accepted' ? '#218838' : PINK}
          />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {order.status === 'accepted'
                ? 'Quotation Accepted'
                : order.status === 'declined'
                  ? 'Quotation Declined'
                  : `Current status: ${order.status.replace(/_/g, ' ')}`}
            </Text>
            <Text style={styles.statusMessage}>
              {order.status === 'accepted'
                ? 'You have accepted this quotation. Check My Orders for the next steps.'
                : order.status === 'declined'
                  ? order.decline_reason ||
                    'This quotation has been declined and can no longer be reviewed here.'
                  : 'This quotation is no longer open for a response.'}
            </Text>
          </View>
        </View>
      )}

      {quotationIsOpen && (
        <View style={styles.actions}>
          <Text style={styles.decisionHint}>
            Please review the price and terms before choosing an action.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={() => respondToQuotation('accepted')}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  Accept Quotation
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.declineButton,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={() => respondToQuotation('declined')}
          >
            <Ionicons
              name="close-circle-outline"
              size={21}
              color={DARK_PINK}
            />
            <Text style={styles.declineButtonText}>
              Decline Quotation
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF7FA',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#777',
    fontSize: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 8,
  },
  backText: {
    color: DARK_PINK,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FCE5ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#33242B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3DCE5',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#33242B',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#8A7880',
    marginBottom: 5,
    marginTop: 12,
  },
  value: {
    fontSize: 14,
    color: '#33242B',
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    color: '#33242B',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3E6EB',
    marginTop: 16,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBC5D3',
  },
  priceHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#33242B',
    marginBottom: 12,
  },
  totalPrice: {
    fontSize: 30,
    fontWeight: '900',
    color: DARK_PINK,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  priceLabel: {
    color: '#66545D',
    fontSize: 14,
  },
  priceValue: {
    color: '#33242B',
    fontSize: 15,
    fontWeight: '700',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#F0DCE4',
    marginVertical: 8,
  },
  balanceLabel: {
    color: '#66545D',
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    color: DARK_PINK,
    fontSize: 18,
    fontWeight: '800',
  },
  paymentNote: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: '#806A73',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#66545D',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3DCE5',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#33242B',
    textTransform: 'capitalize',
  },
  statusMessage: {
    fontSize: 13,
    color: '#66545D',
    lineHeight: 20,
    marginTop: 5,
  },
  actions: {
    marginTop: 4,
    gap: 12,
  },
  decisionHint: {
    fontSize: 13,
    color: '#806A73',
    lineHeight: 19,
    marginBottom: 2,
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: PINK,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  declineButton: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7B5C7',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  declineButtonText: {
    color: DARK_PINK,
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyTitle: {
    color: '#33242B',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 20,
  },
});
