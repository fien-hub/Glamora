// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let bookingsChart = null;
let funnelChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadAnalyticsData();
    
    // Add event listener for time range change
    document.getElementById('timeRange').addEventListener('change', () => {
        loadAnalyticsData();
    });
});

// Refresh data
function refreshData() {
    loadAnalyticsData();
}

// Load analytics data
async function loadAnalyticsData() {
    showLoading();
    
    try {
        const timeRange = parseInt(document.getElementById('timeRange').value);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);
        
        // Fetch analytics events
        const { data: events, error } = await supabase
            .from('analytics_events')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .in('event_type', [
                'booking_from_tagged_post',
                'booking_completed',
                'tagged_post_booking_completed'
            ]);
        
        if (error) throw error;
        
        // Process data
        const metrics = calculateMetrics(events);
        const chartData = prepareChartData(events, timeRange);
        const topServices = calculateTopServices(events);
        const topProviders = calculateTopProviders(events);
        
        // Update UI
        updateMetrics(metrics);
        updateCharts(chartData);
        updateTables(topServices, topProviders);
        
        showContent();
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError();
    }
}

// Calculate metrics
function calculateMetrics(events) {
    const bookingStarts = events.filter(e => e.event_type === 'booking_from_tagged_post');
    const bookingCompletions = events.filter(e => e.event_type === 'tagged_post_booking_completed');
    
    const totalBookings = bookingCompletions.length;
    const conversionRate = bookingStarts.length > 0 
        ? (bookingCompletions.length / bookingStarts.length * 100).toFixed(1)
        : 0;
    
    const totalRevenue = bookingCompletions.reduce((sum, event) => {
        const price = event.properties?.total_price || 0;
        return sum + (price / 100); // Convert cents to dollars
    }, 0);
    
    const avgBookingValue = totalBookings > 0 
        ? (totalRevenue / totalBookings).toFixed(2)
        : 0;
    
    return {
        conversionRate,
        totalRevenue: totalRevenue.toFixed(2),
        totalBookings,
        avgBookingValue
    };
}

// Prepare chart data
function prepareChartData(events, timeRange) {
    const bookingCompletions = events.filter(e => e.event_type === 'tagged_post_booking_completed');
    
    // Group by date
    const dateGroups = {};
    bookingCompletions.forEach(event => {
        const date = new Date(event.created_at).toLocaleDateString();
        dateGroups[date] = (dateGroups[date] || 0) + 1;
    });
    
    // Create arrays for chart
    const dates = Object.keys(dateGroups).sort();
    const counts = dates.map(date => dateGroups[date]);
    
    // Funnel data
    const bookingStarts = events.filter(e => e.event_type === 'booking_from_tagged_post').length;
    const bookingCompleted = bookingCompletions.length;
    
    return {
        timeline: { dates, counts },
        funnel: { starts: bookingStarts, completed: bookingCompleted }
    };
}

// Calculate top services
function calculateTopServices(events) {
    const bookingCompletions = events.filter(e => e.event_type === 'tagged_post_booking_completed');
    
    const serviceStats = {};
    bookingCompletions.forEach(event => {
        const serviceName = event.properties?.service_name || 'Unknown';
        const price = (event.properties?.total_price || 0) / 100;
        
        if (!serviceStats[serviceName]) {
            serviceStats[serviceName] = { bookings: 0, revenue: 0 };
        }
        
        serviceStats[serviceName].bookings += 1;
        serviceStats[serviceName].revenue += price;
    });
    
    // Convert to array and sort by bookings
    return Object.entries(serviceStats)
        .map(([name, stats]) => ({
            name,
            bookings: stats.bookings,
            revenue: stats.revenue.toFixed(2),
            avgValue: (stats.revenue / stats.bookings).toFixed(2)
        }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 10);
}

// Calculate top providers
function calculateTopProviders(events) {
    const bookingCompletions = events.filter(e => e.event_type === 'tagged_post_booking_completed');
    
    const providerStats = {};
    bookingCompletions.forEach(event => {
        const providerId = event.properties?.provider_id || 'Unknown';
        const price = (event.properties?.total_price || 0) / 100;
        
        if (!providerStats[providerId]) {
            providerStats[providerId] = { bookings: 0, revenue: 0 };
        }
        
        providerStats[providerId].bookings += 1;
        providerStats[providerId].revenue += price;
    });
    
    // Convert to array and sort by revenue
    return Object.entries(providerStats)
        .map(([id, stats]) => ({
            id,
            bookings: stats.bookings,
            revenue: stats.revenue.toFixed(2)
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
}

// Update metrics display
function updateMetrics(metrics) {
    document.getElementById('conversionRate').textContent = `${metrics.conversionRate}%`;
    document.getElementById('totalRevenue').textContent = `$${metrics.totalRevenue}`;
    document.getElementById('totalBookings').textContent = metrics.totalBookings;
    document.getElementById('avgBookingValue').textContent = `$${metrics.avgBookingValue}`;

    // Update change indicators (placeholder - would need historical data)
    document.getElementById('conversionChange').textContent = 'vs previous period';
    document.getElementById('revenueChange').textContent = 'vs previous period';
    document.getElementById('bookingsChange').textContent = 'vs previous period';
    document.getElementById('avgValueChange').textContent = 'vs previous period';
}

// Update charts
function updateCharts(chartData) {
    // Destroy existing charts
    if (bookingsChart) bookingsChart.destroy();
    if (funnelChart) funnelChart.destroy();

    // Bookings over time chart
    const bookingsCtx = document.getElementById('bookingsChart').getContext('2d');
    bookingsChart = new Chart(bookingsCtx, {
        type: 'line',
        data: {
            labels: chartData.timeline.dates,
            datasets: [{
                label: 'Bookings',
                data: chartData.timeline.counts,
                borderColor: '#F4B5A4',
                backgroundColor: 'rgba(244, 181, 164, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });

    // Funnel chart
    const funnelCtx = document.getElementById('funnelChart').getContext('2d');
    funnelChart = new Chart(funnelCtx, {
        type: 'bar',
        data: {
            labels: ['Started Booking', 'Completed Booking'],
            datasets: [{
                label: 'Users',
                data: [chartData.funnel.starts, chartData.funnel.completed],
                backgroundColor: ['#D4C5E8', '#F4B5A4']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Update tables
function updateTables(topServices, topProviders) {
    // Top services table
    const servicesBody = document.getElementById('topServicesBody');
    if (topServices.length === 0) {
        servicesBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No data available</td></tr>';
    } else {
        servicesBody.innerHTML = topServices.map(service => `
            <tr>
                <td><strong>${service.name}</strong></td>
                <td>${service.bookings}</td>
                <td>$${service.revenue}</td>
                <td>$${service.avgValue}</td>
            </tr>
        `).join('');
    }

    // Top providers table
    const providersBody = document.getElementById('topProvidersBody');
    if (topProviders.length === 0) {
        providersBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No data available</td></tr>';
    } else {
        providersBody.innerHTML = topProviders.map(provider => `
            <tr>
                <td><strong>Provider ${provider.id.substring(0, 8)}...</strong></td>
                <td>${provider.bookings}</td>
                <td>$${provider.revenue}</td>
            </tr>
        `).join('');
    }
}

// UI state management
function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'none';
}

function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('analyticsContent').style.display = 'none';
}

function showContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'block';
}

