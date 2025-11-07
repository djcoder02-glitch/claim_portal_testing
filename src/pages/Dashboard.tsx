import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  DollarSign, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useClaims } from "@/hooks/useClaims";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

/**
 * Interface for statistics card data
 */
interface StatCard {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
}

/**
 * Interface for monthly data
 */
interface MonthlyData {
  month: string;
  revenue: number;
  claims: number;
}

/**
 * Colors for the pie chart
 */
const COLORS = {
  approved: '#10b981', // green
  paid: '#10b981',     // green (same as approved)
  pending: '#f59e0b',  // orange
  submitted: '#f59e0b', // orange
  rejected: '#ef4444', // red
  under_review: '#3b82f6', // blue
};

/**
 * Dashboard Component
 * 
 * This is the main overview dashboard that displays REAL DATA from Supabase:
 * 1. Total claims count (from claims table)
 * 2. Monthly revenue (calculated from claim_amount)
 * 3. Active surveyors count (from claims with surveyor_name)
 * 4. Completion rate (approved + paid / total claims)
 * 5. Revenue & Claims Trend (last 6 months data)
 * 6. Claim Status Distribution (actual status counts)
 * 7. Recent claims activity (latest claims)
 * 
 * Data Flow:
 * - All data fetched from Supabase using React Query
 * - Real-time calculations based on actual database data
 * - No dummy/mock data used
 */
export const Dashboard = () => {
  const { data: claims = [], isLoading: claimsLoading } = useClaims();

  /**
   * Fetch unique surveyors from claims
   * Counts distinct surveyor names that are assigned to claims
   */
  const { data: surveyorsData, isLoading: surveyorsLoading } = useQuery({
    queryKey: ['active-surveyors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('surveyor_name')
        .not('surveyor_name', 'is', null);
      
      if (error) throw error;
      
      // Get unique surveyor names
      const uniqueSurveyors = [...new Set(
        (data as { surveyor_name: string }[]).map(c => c.surveyor_name).filter(Boolean)
      )];
      
      return uniqueSurveyors.length;
    }
  });

  /**
   * Calculate monthly trend data from actual claims
   * Groups claims by month and calculates revenue
   */
  const monthlyTrendData: MonthlyData[] = useMemo(() => {
    if (!claims.length) return [];

    // Get last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        date,
        month: format(date, 'MMM'),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    });

    return months.map(({ month, start, end }) => {
      const monthClaims = claims.filter(claim => {
        const claimDate = new Date(claim.created_at);
        return claimDate >= start && claimDate <= end;
      });

      const revenue = monthClaims.reduce((sum, claim) => 
        sum + (claim.claim_amount || 0), 0
      );

      return {
        month,
        revenue,
        claims: monthClaims.length
      };
    });
  }, [claims]);

  /**
   * Calculate statistics from real claims data
   */
  const stats = useMemo(() => {
    const totalClaims = claims.length;
    
    // Calculate total revenue (sum of all claim amounts)
    const totalRevenue = claims.reduce((sum, claim) => 
      sum + (claim.claim_amount || 0), 0
    );
    
    // Convert to lakhs (1 lakh = 100,000)
    const revenueInLakhs = totalRevenue / 100000;
    
    // Count approved and paid claims for completion rate
    const completedClaims = claims.filter(c => 
      c.status === 'approved' || c.status === 'paid'
    ).length;
    
    const completionRate = totalClaims > 0 
      ? ((completedClaims / totalClaims) * 100).toFixed(1)
      : 0;

    // Calculate month-over-month growth
    const currentMonthClaims = monthlyTrendData[monthlyTrendData.length - 1]?.claims || 0;
    const lastMonthClaims = monthlyTrendData[monthlyTrendData.length - 2]?.claims || 0;
    const claimsGrowth = lastMonthClaims > 0
      ? (((currentMonthClaims - lastMonthClaims) / lastMonthClaims) * 100).toFixed(1)
      : 0;

    const currentMonthRevenue = monthlyTrendData[monthlyTrendData.length - 1]?.revenue || 0;
    const lastMonthRevenue = monthlyTrendData[monthlyTrendData.length - 2]?.revenue || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? (((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 0;

    return {
      totalClaims,
      revenueInLakhs,
      activeSurveyors: surveyorsData || 0,
      completionRate,
      claimsGrowth: Number(claimsGrowth),
      revenueGrowth: Number(revenueGrowth),
    };
  }, [claims, surveyorsData, monthlyTrendData]);

  /**
   * Prepare data for status distribution pie chart
   * Uses actual status counts from database
   */
  const statusDistribution = useMemo(() => {
    return [
      { 
        name: 'Approved/Paid', 
        value: claims.filter(c => c.status === 'approved' || c.status === 'paid').length,
        color: COLORS.approved
      },
      { 
        name: 'Pending/Submitted', 
        value: claims.filter(c => c.status === 'pending' || c.status === 'submitted').length,
        color: COLORS.pending
      },
      { 
        name: 'Under Review', 
        value: claims.filter(c => c.status === 'under_review').length,
        color: COLORS.under_review
      },
      { 
        name: 'Rejected', 
        value: claims.filter(c => c.status === 'rejected').length,
        color: COLORS.rejected
      },
    ].filter(item => item.value > 0); // Only show statuses with data
  }, [claims]);

  /**
   * Get recent activity - claims from today
   */
  const todayClaims = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return claims.filter(claim => {
      const claimDate = new Date(claim.created_at);
      claimDate.setHours(0, 0, 0, 0);
      return claimDate.getTime() === today.getTime();
    });
  }, [claims]);

  /**
   * Count claims needing review (submitted or under_review status)
   */
  const reviewCount = useMemo(() => {
    return claims.filter(c => 
      c.status === 'submitted' || c.status === 'under_review'
    ).length;
  }, [claims]);

  /**
   * Get recent surveyors (unique surveyors from last 7 days)
   */
  const recentSurveyors = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentClaims = claims.filter(claim => 
      new Date(claim.created_at) >= sevenDaysAgo && claim.surveyor_name
    );
    
    const uniqueSurveyors = [...new Set(recentClaims.map(c => c.surveyor_name))];
    return uniqueSurveyors.length;
  }, [claims]);

  /**
   * Stat cards configuration with real data
   */
  const statCards: StatCard[] = [
    {
      title: 'Total Claims',
      value: stats.totalClaims.toLocaleString(),
      change: `${stats.claimsGrowth >= 0 ? '+' : ''}${stats.claimsGrowth}% from last month`,
      isPositive: stats.claimsGrowth >= 0,
      description: 'Active insurance claims',
      icon: FileText,
      iconBgColor: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Total Revenue',
      value: stats.revenueInLakhs > 0 ? `₹${stats.revenueInLakhs.toFixed(1)}L` : '₹0',
      change: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}% from last month`,
      isPositive: stats.revenueGrowth >= 0,
      description: 'Total claim amounts',
      icon: DollarSign,
      iconBgColor: 'bg-green-100 text-green-600',
    },
    {
      title: 'Active Surveyors',
      value: stats.activeSurveyors,
      change: `${recentSurveyors} active this week`,
      isPositive: true,
      description: 'Assigned surveyors',
      icon: Users,
      iconBgColor: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Completion Rate',
      value: `${stats.completionRate}%`,
      change: 'Approved + paid claims',
      isPositive: Number(stats.completionRate) >= 50,
      description: 'Claim completion rate',
      icon: TrendingUp,
      iconBgColor: 'bg-orange-100 text-orange-600',
    },
  ];

  if (claimsLoading || surveyorsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no data
  if (claims.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Claims Yet</h3>
          <p className="text-gray-600">
            Create your first claim to see dashboard statistics and analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50">
      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </h3>
                  <div className="flex items-center gap-1 text-sm">
                    {stat.isPositive ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={stat.isPositive ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.iconBgColor}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Claims Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <CardTitle>Revenue & Claims Trend (Last 6 Months)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') {
                        return [`₹${(value / 100000).toFixed(2)}L`, 'Revenue'];
                      }
                      return [value, 'Claims'];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Not enough data to display trend
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claim Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <CardTitle>Claim Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="mt-4 space-y-2">
                  {statusDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle>Quick Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Created Today</p>
                <span className="text-2xl font-bold text-green-600">
                  {todayClaims.length}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Pending Review</p>
                <span className="text-2xl font-bold text-yellow-600">
                  {reviewCount}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">This Month</p>
                <span className="text-2xl font-bold text-blue-600">
                  {monthlyTrendData[monthlyTrendData.length - 1]?.claims || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <CardTitle>Recent Claims</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {claims.slice(0, 5).map((claim) => (
              <div 
                key={claim.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors mb-2"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{claim.title}</p>
                  <p className="text-sm text-gray-500">
                    {claim.claim_number} • {format(new Date(claim.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {claim.claim_amount && (
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{(claim.claim_amount / 100000).toFixed(2)}L
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    claim.status === 'approved' || claim.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : claim.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : claim.status === 'under_review'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {claim.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {claims.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent claims</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};