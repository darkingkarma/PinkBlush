import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { supabase } from '../../../supabase';

type OrderRecord = {
  id: string;
  status: string | null;
  total_amount: number | string | null;
  created_at: string | null;
};

type CustomOrderRecord = {
  id: string;
  status: string | null;
  quoted_price: number | string | null;
  deposit_amount: number | string | null;
  created_at: string | null;
};

type PaymentRecord = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  amount: number | string | null;
  payment_type: string | null;
  status: string | null;
  created_at: string | null;
};

type ProductionRecord = {
  id: string;
  order_id: string | null;
  custom_order_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type ReportSection = {
  title: string;
  rows: [string, string | number][];
};

const PINK = '#D96B8A';
const DARK_PINK = '#B84470';
const LIGHT_PINK = '#FFF1F5';
const BACKGROUND = '#FFF8FA';
const TEXT = '#38252D';
const MUTED = '#8C7880';
const BORDER = '#F1DDE4';

const formatCurrency = (value: number) => {
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status: string | null | undefined) => {
  return (status ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
};

const formatStatus = (status: string | null | undefined) => {
  return (status ?? 'Unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};


const getStatusCount = (
  records: { status: string | null }[],
  status: string,
) => {
  return records.filter(
    (record) => normalizeStatus(record.status) === status,
  ).length;
};

const sumAmounts = (records: PaymentRecord[]) => {
  return records.reduce(
    (total, payment) => total + toNumber(payment.amount),
    0,
  );
};

export default function ReportsManagementScreen() {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 700;

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrderRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [productionRecords, setProductionRecords] = useState<
    ProductionRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadReports = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    setLoadError('');

    try {
      const [
        ordersResult,
        customOrdersResult,
        paymentsResult,
        productionResult,
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('custom_orders')
          .select(
            'id, status, quoted_price, deposit_amount, created_at',
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select(
            'id, order_id, custom_order_id, amount, payment_type, status, created_at',
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('production_tracking')
          .select(
            'id, order_id, custom_order_id, status, updated_at',
          )
          .order('updated_at', {
            ascending: false,
            nullsFirst: false,
          }),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (customOrdersResult.error) throw customOrdersResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (productionResult.error) throw productionResult.error;

      setOrders((ordersResult.data ?? []) as OrderRecord[]);
      setCustomOrders(
        (customOrdersResult.data ?? []) as CustomOrderRecord[],
      );
      setPayments((paymentsResult.data ?? []) as PaymentRecord[]);
      setProductionRecords(
        (productionResult.data ?? []) as ProductionRecord[],
      );
    } catch (error: any) {
      console.error('Reports loading error:', error);

      setLoadError(
        error?.message || 'Unable to load reports. Please try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports(false);
  }, [loadReports]);

  const reportData = useMemo(() => {
    const paidPayments = payments.filter(
      (payment) => normalizeStatus(payment.status) === 'paid',
    );

    const pendingPayments = payments.filter(
      (payment) => normalizeStatus(payment.status) === 'pending',
    );

    const failedPayments = payments.filter((payment) =>
      ['failed', 'cancelled', 'canceled'].includes(
        normalizeStatus(payment.status),
      ),
    );

    const depositPayments = paidPayments.filter(
      (payment) =>
        normalizeStatus(payment.payment_type) === 'deposit',
    );

    const balancePayments = paidPayments.filter(
      (payment) =>
        normalizeStatus(payment.payment_type) === 'balance',
    );

    const totalPaid = sumAmounts(paidPayments);
    const totalPendingPayments = sumAmounts(pendingPayments);
    const totalDeposits = sumAmounts(depositPayments);
    const totalBalancePayments = sumAmounts(balancePayments);

    const catalogOrderValue = orders.reduce((total, order) => {
      if (normalizeStatus(order.status) === 'cancelled') {
        return total;
      }

      return total + toNumber(order.total_amount);
    }, 0);

    const customQuotedValue = customOrders.reduce(
      (total, order) => {
        const status = normalizeStatus(order.status);

        if (
          status === 'declined' ||
          status === 'cancelled' ||
          status === 'canceled'
        ) {
          return total;
        }

        return total + toNumber(order.quoted_price);
      },
      0,
    );

    // Calculate payments received for each catalog order.
    const catalogPaidByOrder: Record<string, number> = {};

    paidPayments.forEach((payment) => {
      if (!payment.order_id) return;

      catalogPaidByOrder[payment.order_id] =
        (catalogPaidByOrder[payment.order_id] ?? 0) +
        toNumber(payment.amount);
    });

    // Calculate payments received for each custom order.
    const customPaidByOrder: Record<string, number> = {};

    paidPayments.forEach((payment) => {
      if (!payment.custom_order_id) return;

      customPaidByOrder[payment.custom_order_id] =
        (customPaidByOrder[payment.custom_order_id] ?? 0) +
        toNumber(payment.amount);
    });

    // Exclude cancelled catalog orders from outstanding balances.
    // Pending orders are included because they may already have deposits.
    const catalogOutstanding = orders.reduce((total, order) => {
      if (normalizeStatus(order.status) === 'cancelled') {
        return total;
      }

      const orderTotal = toNumber(order.total_amount);
      const amountPaid = catalogPaidByOrder[order.id] ?? 0;

      return total + Math.max(orderTotal - amountPaid, 0);
    }, 0);

    // Only include custom orders that have an accepted quotation.
    const acceptedCustomStatuses = [
      'accepted',
      'measurements_pending',
      'awaiting_deposit',
      'deposit_paid',
      'in_production',
      'ready_for_fitting',
      'ready_for_release',
    ];

    const customOutstanding = customOrders.reduce(
      (total, order) => {
        const status = normalizeStatus(order.status);

        if (!acceptedCustomStatuses.includes(status)) {
          return total;
        }

        const quotedPrice = toNumber(order.quoted_price);
        const amountPaid = customPaidByOrder[order.id] ?? 0;

        return total + Math.max(quotedPrice - amountPaid, 0);
      },
      0,
    );

    // Keep only the latest production status for each order.
    // The query is sorted newest first, and null dates are placed last.
    const latestProduction: Record<string, ProductionRecord> = {};

    const sortedProduction = [...productionRecords].sort((a, b) => {
      const dateA = a.updated_at
        ? new Date(a.updated_at).getTime()
        : 0;

      const dateB = b.updated_at
        ? new Date(b.updated_at).getTime()
        : 0;

      return dateB - dateA;
    });

    sortedProduction.forEach((record) => {
      const key = record.order_id
        ? `catalog-${record.order_id}`
        : record.custom_order_id
          ? `custom-${record.custom_order_id}`
          : `record-${record.id}`;

      if (!latestProduction[key]) {
        latestProduction[key] = record;
      }
    });

    const latestProductionRecords = Object.values(latestProduction);

    const productionStatusCounts = {
      assigned: getStatusCount(latestProductionRecords, 'assigned'),
      cutting: getStatusCount(latestProductionRecords, 'cutting'),
      sewing: getStatusCount(latestProductionRecords, 'sewing'),
      fitting: getStatusCount(latestProductionRecords, 'fitting'),
      finishing: getStatusCount(latestProductionRecords, 'finishing'),
      readyForPickup: getStatusCount(
        latestProductionRecords,
        'ready_for_pickup',
      ),
      completed: getStatusCount(
        latestProductionRecords,
        'completed',
      ),
    };

    const recentOrders = [
      ...orders.map((order) => ({
        id: order.id,
        type: 'Catalog',
        status: order.status,
        amount: toNumber(order.total_amount),
        created_at: order.created_at,
      })),
      ...customOrders.map((order) => ({
        id: order.id,
        type: 'Custom',
        status: order.status,
        amount: toNumber(order.quoted_price),
        created_at: order.created_at,
      })),
    ]
      .sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      })
      .slice(0, 5);

    const recentPayments = payments.slice(0, 5);

    return {
      paidPayments,
      pendingPayments,
      failedPayments,
      totalPaid,
      totalPendingPayments,
      totalDeposits,
      totalBalancePayments,
      catalogOrderValue,
      customQuotedValue,
      catalogOutstanding,
      customOutstanding,
      totalOutstanding: catalogOutstanding + customOutstanding,
      productionStatusCounts,
      latestProductionRecords,
      recentOrders,
      recentPayments,
    };
  }, [orders, customOrders, payments, productionRecords]);

  const reportSections = useMemo<ReportSection[]>(() => {
    return [
      {
        title: 'Order Summary',
        rows: [
          ['Total Catalog Orders', orders.length],
          ['Total Custom Orders', customOrders.length],
          ['Catalog Order Value', formatCurrency(reportData.catalogOrderValue)],
          ['Custom Quoted Value', formatCurrency(reportData.customQuotedValue)],
        ],
      },
      {
        title: 'Catalog Order Status',
        rows: [
          ['Pending', getStatusCount(orders, 'pending')],
          ['Accepted', getStatusCount(orders, 'accepted')],
          ['In Production', getStatusCount(orders, 'in_production')],
          ['Ready for Release', getStatusCount(orders, 'ready_for_release')],
          ['Completed', getStatusCount(orders, 'completed')],
          ['Cancelled', getStatusCount(orders, 'cancelled')],
        ],
      },
      {
        title: 'Custom Order Status',
        rows: [
          ['Submitted', getStatusCount(customOrders, 'submitted')],
          ['Under Review', getStatusCount(customOrders, 'under_review')],
          ['Quotation Sent', getStatusCount(customOrders, 'quotation_sent')],
          ['Accepted', getStatusCount(customOrders, 'accepted')],
          ['In Production', getStatusCount(customOrders, 'in_production')],
          ['Ready for Fitting', getStatusCount(customOrders, 'ready_for_fitting')],
          ['Ready for Release', getStatusCount(customOrders, 'ready_for_release')],
          ['Completed', getStatusCount(customOrders, 'completed')],
          ['Declined', getStatusCount(customOrders, 'declined')],
          ['Cancelled', getStatusCount(customOrders, 'cancelled')],
        ],
      },
      {
        title: 'Payment Summary',
        rows: [
          ['Total Payments Received', formatCurrency(reportData.totalPaid)],
          ['Deposit Payments Received', formatCurrency(reportData.totalDeposits)],
          ['Balance Payments Received', formatCurrency(reportData.totalBalancePayments)],
          ['Pending Payment Records', reportData.pendingPayments.length],
          ['Pending Payment Amount', formatCurrency(reportData.totalPendingPayments)],
          ['Failed / Cancelled Payments', reportData.failedPayments.length],
          ['Outstanding Catalog Balances', formatCurrency(reportData.catalogOutstanding)],
          ['Outstanding Custom Balances', formatCurrency(reportData.customOutstanding)],
          ['Total Outstanding Balance', formatCurrency(reportData.totalOutstanding)],
        ],
      },
      {
        title: 'Production Summary',
        rows: [
          ['Assigned', reportData.productionStatusCounts.assigned],
          ['Cutting', reportData.productionStatusCounts.cutting],
          ['Sewing', reportData.productionStatusCounts.sewing],
          ['Fitting', reportData.productionStatusCounts.fitting],
          ['Finishing', reportData.productionStatusCounts.finishing],
          ['Ready for Pickup', reportData.productionStatusCounts.readyForPickup],
          ['Completed', reportData.productionStatusCounts.completed],
          ['Tracked Production Orders', reportData.latestProductionRecords.length],
        ],
      },
    ];
  }, [orders, customOrders, reportData]);

  const exportPDF = async () => {
    if (exporting) return;

    try {
      setExporting(true);

      const generatedDate = new Date().toLocaleString('en-PH');

      const sectionsHTML = reportSections
        .map(
          (section) => `
            <div class="section">
              <h2>${escapeHtml(section.title)}</h2>
              <table>
                ${section.rows
                  .map(
                    ([label, value]) => `
                      <tr>
                        <td>${escapeHtml(String(label))}</td>
                        <td class="value">${escapeHtml(String(value))}</td>
                      </tr>
                    `,
                  )
                  .join('')}
              </table>
            </div>
          `,
        )
        .join('');

      const recentOrdersHTML = reportData.recentOrders
        .map(
          (order) => `
            <tr>
              <td>${escapeHtml(order.type)}</td>
              <td>${escapeHtml(order.id.slice(0, 8))}</td>
              <td>${escapeHtml(formatStatus(order.status))}</td>
              <td>${escapeHtml(formatCurrency(order.amount))}</td>
              <td>${escapeHtml(formatDate(order.created_at))}</td>
            </tr>
          `,
        )
        .join('');

      const recentPaymentsHTML = reportData.recentPayments
        .map(
          (payment) => `
            <tr>
              <td>${escapeHtml(payment.id.slice(0, 8))}</td>
              <td>${escapeHtml(formatStatus(payment.payment_type))}</td>
              <td>${escapeHtml(formatStatus(payment.status))}</td>
              <td>${escapeHtml(formatCurrency(toNumber(payment.amount)))}</td>
              <td>${escapeHtml(formatDate(payment.created_at))}</td>
            </tr>
          `,
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #38252D;
              }

              h1 {
                color: #B84470;
                margin-bottom: 4px;
              }

              .subtitle {
                color: #8C7880;
                font-size: 12px;
                margin-bottom: 24px;
              }

              h2 {
                color: #B84470;
                font-size: 16px;
                margin-bottom: 8px;
              }

              .section {
                margin-bottom: 24px;
                page-break-inside: avoid;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              td, th {
                padding: 9px;
                border-bottom: 1px solid #F1DDE4;
                text-align: left;
                font-size: 11px;
              }

              th {
                background: #FFF1F5;
                color: #B84470;
              }

              .value {
                text-align: right;
                font-weight: bold;
              }
            </style>
          </head>

          <body>
            <h1>Pink Blush Reports</h1>
            <p class="subtitle">Generated: ${escapeHtml(generatedDate)}</p>

            ${sectionsHTML}

            <div class="section">
              <h2>Recent Orders</h2>
              <table>
                <tr>
                  <th>Type</th>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
                ${recentOrdersHTML || '<tr><td colspan="5">No orders found.</td></tr>'}
              </table>
            </div>

            <div class="section">
              <h2>Recent Payments</h2>
              <table>
                <tr>
                  <th>Payment ID</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
                ${recentPaymentsHTML || '<tr><td colspan="5">No payments found.</td></tr>'}
              </table>
            </div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          'Sharing unavailable',
          'Your device does not support sharing the generated PDF.',
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Pink Blush Reports',
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      console.error('PDF export error:', error);

      Alert.alert(
        'Export Failed',
        error?.message || 'Unable to export the PDF report.',
      );
    } finally {
      setExporting(false);
    }
  };

  

  const renderSummaryCard = (
    title: string,
    value: string,
    icon: keyof typeof Ionicons.glyphMap,
    description: string,
  ) => (
    <View style={[styles.summaryCard, isWideScreen && styles.summaryCardWide]}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryIcon}>
          <Ionicons name={icon} size={21} color={DARK_PINK} />
        </View>
      </View>

      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
  );

  const renderReportSection = (section: ReportSection) => (
    <View key={section.title} style={styles.reportCard}>
      <Text style={styles.cardTitle}>{section.title}</Text>

      {section.rows.map(([label, value], index) => (
        <View
          key={`${section.title}-${String(label)}`}
          style={[
            styles.reportRow,
            index === section.rows.length - 1 && styles.lastReportRow,
          ]}
        >
          <Text style={styles.reportLabel}>{label}</Text>
          <Text style={styles.reportValue}>{value}</Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={38}
            color={DARK_PINK}
          />
        </View>

        <Text style={styles.errorTitle}>Unable to Load Reports</Text>
        <Text style={styles.errorMessage}>{loadError}</Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => loadReports()}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={PINK}
          colors={[PINK]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>
              Order, production, and payment overview
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="stats-chart-outline"
              size={25}
              color={DARK_PINK}
            />
          </View>
        </View>

        <View style={styles.exportContainer}>
          <Pressable
            style={[
              styles.exportButton,
              exporting && styles.disabledButton,
            ]}
            onPress={exportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={19}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.exportButtonText}>
              {exporting ? 'Preparing PDF...' : 'Export PDF'}
            </Text>
          </Pressable>

          
        </View>

        <Text style={styles.sectionHeading}>Overview</Text>

        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            'Catalog Orders',
            String(orders.length),
            'bag-handle-outline',
            'Total catalog orders',
          )}

          {renderSummaryCard(
            'Custom Orders',
            String(customOrders.length),
            'shirt-outline',
            'Total custom requests',
          )}

          {renderSummaryCard(
            'Payments Received',
            formatCurrency(reportData.totalPaid),
            'wallet-outline',
            'Successfully paid transactions',
          )}

          {renderSummaryCard(
            'Outstanding Balance',
            formatCurrency(reportData.totalOutstanding),
            'alert-circle-outline',
            'Remaining order balances',
          )}
        </View>

        <Text style={styles.sectionHeading}>Detailed Reports</Text>

        {reportSections.map(renderReportSection)}

        <View style={styles.reportCard}>
          <Text style={styles.cardTitle}>Recent Orders</Text>

          {reportData.recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>No orders available.</Text>
          ) : (
            reportData.recentOrders.map((order, index) => (
              <View
                key={`${order.type}-${order.id}`}
                style={[
                  styles.recentRow,
                  index === reportData.recentOrders.length - 1 &&
                    styles.lastReportRow,
                ]}
              >
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle}>
                    {order.type} Order
                  </Text>

                  <Text style={styles.recentSubtitle}>
                    #{order.id.slice(0, 8)} · {formatDate(order.created_at)}
                  </Text>

                  <Text style={styles.recentStatus}>
                    {formatStatus(order.status)}
                  </Text>
                </View>

                <Text style={styles.recentAmount}>
                  {formatCurrency(order.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.reportCard}>
          <Text style={styles.cardTitle}>Recent Payments</Text>

          {reportData.recentPayments.length === 0 ? (
            <Text style={styles.emptyText}>No payments available.</Text>
          ) : (
            reportData.recentPayments.map((payment, index) => (
              <View
                key={payment.id}
                style={[
                  styles.recentRow,
                  index === reportData.recentPayments.length - 1 &&
                    styles.lastReportRow,
                ]}
              >
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle}>
                    {formatStatus(payment.payment_type)} Payment
                  </Text>

                  <Text style={styles.recentSubtitle}>
                    #{payment.id.slice(0, 8)} · {formatDate(payment.created_at)}
                  </Text>

                  <Text style={styles.recentStatus}>
                    {formatStatus(payment.status)}
                  </Text>
                </View>

                <Text style={styles.recentAmount}>
                  {formatCurrency(toNumber(payment.amount))}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.noteContainer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={DARK_PINK}
          />

          <Text style={styles.noteText}>
            Order values and quoted values are not the same as actual
            payments received. Payment totals include only transactions
            marked as paid.
          </Text>
        </View>

        <Text style={styles.footerText}>
          Pink Blush Garment Order and Production Management System
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  content: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  centerContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  loadingText: {
    color: MUTED,
    fontSize: 14,
    marginTop: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: TEXT,
  },

  headerSubtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 5,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: LIGHT_PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },

  exportContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },

  exportButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: DARK_PINK,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },


  disabledButton: {
    opacity: 0.6,
  },

  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  sectionHeading: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 13,
    marginTop: 3,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },

  summaryCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
  },

  summaryCardWide: {
    flexBasis: '45%',
  },

  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: LIGHT_PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },

  summaryTitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
  },

  summaryValue: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 5,
  },

  summaryDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },

  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 15,
  },

  cardTitle: {
    color: DARK_PINK,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },

  reportRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F8EDF1',
    paddingVertical: 9,
    gap: 10,
  },

  lastReportRow: {
    borderBottomWidth: 0,
  },

  reportLabel: {
    color: MUTED,
    fontSize: 12,
    flex: 1,
  },

  reportValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 0,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F8EDF1',
    paddingVertical: 12,
    gap: 10,
  },

  recentInfo: {
    flex: 1,
  },

  recentTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },

  recentSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  recentStatus: {
    color: DARK_PINK,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },

  recentAmount: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 15,
  },

  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LIGHT_PINK,
    borderRadius: 12,
    padding: 13,
    gap: 9,
    marginTop: 2,
  },

  noteText: {
    flex: 1,
    color: '#805366',
    fontSize: 11,
    lineHeight: 17,
  },

  footerText: {
    color: MUTED,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 22,
  },

  errorIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: LIGHT_PINK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  errorTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorMessage: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },

  retryButton: {
    backgroundColor: DARK_PINK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});