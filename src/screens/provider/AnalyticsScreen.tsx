import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import Svg, { Rect, Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import FadeInView from '../../components/animations/FadeInView';
import StaggeredList from '../../components/animations/StaggeredList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CHART_HEIGHT = 200;

interface AnalyticsData {
  bookingTrends: { date: string; count: number }[];
  popularServices: { name: string; count: number; revenue: number }[];
  peakHours: { hour: number; count: number }[];
  revenueData: { month: string; revenue: number }[];
  customerInsights: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
  };
  performanceMetrics: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    completionRate: number;
    cancellationRate: number;
    averageRating: number;
  };
}

type TimePeriod = '7days' | '30days' | '90days' | '1year';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    bookingTrends: [],
    popularServices: [],
    peakHours: [],
    revenueData: [],
    customerInsights: {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
    },
    performanceMetrics: {
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      completionRate: 0,
      cancellationRate: 0,
      averageRating: 0,
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (timePeriod === '7days') startDate.setDate(endDate.getDate() - 7);
      else if (timePeriod === '30days') startDate.setDate(endDate.getDate() - 30);
      else if (timePeriod === '90days') startDate.setDate(endDate.getDate() - 90);
      else if (timePeriod === '1year') startDate.setFullYear(endDate.getFullYear() - 1);

      // Fetch all bookings with related data
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          provider_service:provider_services(
            service:services(name),
            price
          ),
          payment:payments(amount, status)
        `)
        .eq('provider_id', profile.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process analytics data
      processAnalyticsData(bookings || [], startDate, endDate);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const processAnalyticsData = (bookings: any[], startDate: Date, endDate: Date) => {
    // 1. Booking Trends (daily counts)
    const bookingTrends = generateBookingTrends(bookings, startDate, endDate);

    // 2. Popular Services
    const serviceMap = new Map<string, { count: number; revenue: number }>();
    bookings.forEach((booking) => {
      const serviceName = booking.provider_service?.service?.name || 'Unknown';
      const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 };
      const payment = booking.payment?.[0];
      const revenue = payment?.status === 'succeeded' ? payment.amount : 0;
      serviceMap.set(serviceName, {
        count: existing.count + 1,
        revenue: existing.revenue + revenue,
      });
    });
    const popularServices = Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Peak Hours
    const hourMap = new Map<number, number>();
    bookings.forEach((booking) => {
      const time = booking.scheduled_time;
      if (!time) return;
      const [hours] = time.split(':');
      const hour = parseInt(hours, 10);
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const peakHours = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // 4. Revenue Data (monthly)
    const revenueMap = new Map<string, number>();
    bookings.forEach((booking) => {
      const payment = booking.payment?.[0];
      if (payment?.status === 'succeeded') {
        const date = new Date(booking.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        revenueMap.set(monthKey, (revenueMap.get(monthKey) || 0) + payment.amount);
      }
    });
    const revenueData = Array.from(revenueMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 5. Customer Insights
    const customerSet = new Set<string>();
    const customerBookingCount = new Map<string, number>();
    bookings.forEach((booking) => {
      customerSet.add(booking.customer_id);
      customerBookingCount.set(
        booking.customer_id,
        (customerBookingCount.get(booking.customer_id) || 0) + 1
      );
    });
    const newCustomers = Array.from(customerBookingCount.values()).filter((count) => count === 1).length;
    const returningCustomers = customerSet.size - newCustomers;

    // 6. Performance Metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    // Get average rating from provider profile
    supabase
      .from('provider_profiles')
      .select('rating')
      .eq('id', profile.id)
      .single()
      .then(({ data }) => {
        setAnalytics((prev) => ({
          ...prev,
          performanceMetrics: {
            ...prev.performanceMetrics,
            averageRating: data?.rating || 0,
          },
        }));
      });

    setAnalytics({
      bookingTrends,
      popularServices,
      peakHours,
      revenueData,
      customerInsights: {
        totalCustomers: customerSet.size,
        newCustomers,
        returningCustomers,
      },
      performanceMetrics: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        completionRate: parseFloat(completionRate.toFixed(1)),
        cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        averageRating: 0, // Will be updated by the query above
      },
    });
  };

  const generateBookingTrends = (bookings: any[], startDate: Date, endDate: Date) => {
    const dateMap = new Map<string, number>();
    const currentDate = new Date(startDate);

    // Initialize all dates with 0
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dateMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count bookings per date
    bookings.forEach((booking) => {
      const dateKey = booking.created_at.split('T')[0];
      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {(['7days', '30days', '90days', '1year'] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, timePeriod === period && styles.periodButtonActive]}
            onPress={() => setTimePeriod(period)}
          >
            <Text style={[styles.periodButtonText, timePeriod === period && styles.periodButtonTextActive]}>
              {period === '7days' ? '7 Days' : period === '30days' ? '30 Days' : period === '90days' ? '90 Days' : '1 Year'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.performanceMetrics.totalBookings}</Text>
            <Text style={styles.metricLabel}>Total Bookings</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {analytics.performanceMetrics.completionRate}%
            </Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.error }]}>
              {analytics.performanceMetrics.cancellationRate}%
            </Text>
            <Text style={styles.metricLabel}>Cancellation Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {analytics.performanceMetrics.averageRating.toFixed(1)}⭐
            </Text>
            <Text style={styles.metricLabel}>Average Rating</Text>
          </View>
        </View>
      </View>

      {/* Booking Trends Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Trends</Text>
        <View style={styles.chartContainer}>
          {analytics.bookingTrends.length > 0 ? (
            <BookingTrendsChart data={analytics.bookingTrends} />
          ) : (
            <Text style={styles.noDataText}>No booking data available</Text>
          )}
        </View>
      </View>

      {/* Popular Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        {analytics.popularServices.length > 0 ? (
          analytics.popularServices.map((service, index) => (
            <View key={index} style={styles.serviceCard}>
              <View style={styles.serviceRank}>
                <Text style={styles.serviceRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceStats}>
                  {service.count} bookings • {formatCurrency(service.revenue)} revenue
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No service data available</Text>
        )}
      </View>

      {/* Peak Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Peak Hours</Text>
        <View style={styles.chartContainer}>
          {analytics.peakHours.length > 0 ? (
            <PeakHoursChart data={analytics.peakHours} />
          ) : (
            <Text style={styles.noDataText}>No peak hours data available</Text>
          )}
        </View>
      </View>

      {/* Revenue Trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trends</Text>
        <View style={styles.chartContainer}>
          {analytics.revenueData.length > 0 ? (
            <RevenueTrendsChart data={analytics.revenueData} />
          ) : (
            <Text style={styles.noDataText}>No revenue data available</Text>
          )}
        </View>
      </View>

      {/* Customer Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Insights</Text>
        <View style={styles.customerInsightsContainer}>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>{analytics.customerInsights.totalCustomers}</Text>
            <Text style={styles.insightLabel}>Total Customers</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={[styles.insightValue, { color: colors.success }]}>
              {analytics.customerInsights.newCustomers}
            </Text>
            <Text style={styles.insightLabel}>New Customers</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={[styles.insightValue, { color: colors.primary }]}>
              {analytics.customerInsights.returningCustomers}
            </Text>
            <Text style={styles.insightLabel}>Returning</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Chart Components
const BookingTrendsChart = ({ data }: { data: { date: string; count: number }[] }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const padding = 40;
  const chartWidth = CHART_WIDTH - padding * 2;
  const chartHeight = CHART_HEIGHT - padding * 2;
  const barWidth = chartWidth / data.length;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Y-axis */}
      <Line x1={padding} y1={padding} x2={padding} y2={CHART_HEIGHT - padding} stroke={colors.border} strokeWidth={2} />
      {/* X-axis */}
      <Line
        x1={padding}
        y1={CHART_HEIGHT - padding}
        x2={CHART_WIDTH - padding}
        y2={CHART_HEIGHT - padding}
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Bars */}
      {data.map((item, index) => {
        const barHeight = (item.count / maxCount) * chartHeight;
        const x = padding + index * barWidth + barWidth * 0.2;
        const y = CHART_HEIGHT - padding - barHeight;
        const width = barWidth * 0.6;

        return (
          <React.Fragment key={index}>
            <Rect x={x} y={y} width={width} height={barHeight} fill={colors.primary} rx={4} />
            {index % Math.ceil(data.length / 5) === 0 && (
              <SvgText
                x={x + width / 2}
                y={CHART_HEIGHT - padding + 20}
                fontSize={10}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {new Date(item.date).getDate()}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const PeakHoursChart = ({ data }: { data: { hour: number; count: number }[] }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const padding = 40;
  const chartWidth = CHART_WIDTH - padding * 2;
  const chartHeight = CHART_HEIGHT - padding * 2;

  // Fill in missing hours with 0
  const fullData = Array.from({ length: 24 }, (_, i) => {
    const existing = data.find((d) => d.hour === i);
    return { hour: i, count: existing?.count || 0 };
  });

  const barWidth = chartWidth / 24;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Y-axis */}
      <Line x1={padding} y1={padding} x2={padding} y2={CHART_HEIGHT - padding} stroke={colors.border} strokeWidth={2} />
      {/* X-axis */}
      <Line
        x1={padding}
        y1={CHART_HEIGHT - padding}
        x2={CHART_WIDTH - padding}
        y2={CHART_HEIGHT - padding}
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Bars */}
      {fullData.map((item, index) => {
        const barHeight = (item.count / maxCount) * chartHeight;
        const x = padding + index * barWidth + barWidth * 0.1;
        const y = CHART_HEIGHT - padding - barHeight;
        const width = barWidth * 0.8;

        return (
          <React.Fragment key={index}>
            <Rect x={x} y={y} width={width} height={barHeight} fill={colors.secondary} rx={2} />
            {index % 3 === 0 && (
              <SvgText
                x={x + width / 2}
                y={CHART_HEIGHT - padding + 20}
                fontSize={9}
                fill={colors.textSecondary}
                textAnchor="middle"
              >
                {item.hour}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const RevenueTrendsChart = ({ data }: { data: { month: string; revenue: number }[] }) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const padding = 40;
  const chartWidth = CHART_WIDTH - padding * 2;
  const chartHeight = CHART_HEIGHT - padding * 2;

  // Calculate points for line chart
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = CHART_HEIGHT - padding - (item.revenue / maxRevenue) * chartHeight;
    return { x, y, revenue: item.revenue };
  });

  // Create path for line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create path for area fill
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${CHART_HEIGHT - padding} L ${padding} ${CHART_HEIGHT - padding} Z`;

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Y-axis */}
      <Line x1={padding} y1={padding} x2={padding} y2={CHART_HEIGHT - padding} stroke={colors.border} strokeWidth={2} />
      {/* X-axis */}
      <Line
        x1={padding}
        y1={CHART_HEIGHT - padding}
        x2={CHART_WIDTH - padding}
        y2={CHART_HEIGHT - padding}
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Area fill */}
      <Path d={areaPath} fill={colors.success + '20'} />

      {/* Line */}
      <Path d={linePath} stroke={colors.success} strokeWidth={3} fill="none" />

      {/* Points */}
      {points.map((point, index) => (
        <Circle key={index} cx={point.x} cy={point.y} r={4} fill={colors.success} />
      ))}

      {/* Labels */}
      {data.map((item, index) => {
        if (index % Math.ceil(data.length / 4) === 0) {
          const [, month] = item.month.split('-');
          return (
            <SvgText
              key={index}
              x={points[index].x}
              y={CHART_HEIGHT - padding + 20}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month) - 1]}
            </SvgText>
          );
        }
        return null;
      })}
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primaryDarker,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: colors.black,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  serviceRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceRankText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.white,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  serviceStats: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  customerInsightsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightCard: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  insightValue: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  insightLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

