import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "react-router-dom";

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
}

interface MonthlyData {
  month: string;
  claims: number;
}

const COLORS = {
  pending: 'rgb(37, 99, 235)',
  submitted: 'rgb(245, 158, 11)',
  under_review: 'rgb(59, 130, 246)',
  approved: 'rgb(16, 185, 129)',
  rejected: 'rgb(239, 68, 68)',
  paid: 'rgb(16, 185, 129)',
};

/**
 * UserDashboard - Performance-focused dashboard for regular users
 * Shows personal workload and performance metrics without revenue data
 */
export const UserDashboard = () => {
  const { data: claims = [], isLoading: claimsLoading } = useClaims();

  // Calculate monthly trend data for personal claims
  const monthlyTrendData: MonthlyData[] = useMemo(() => {
    if (!claims.length) return [];

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
        const claimDate = new Date(claim.updated_at);
        return claimDate >= start && claimDate <= end;
      });

      return {
        month,
        claims: monthClaims.length
      };
    });
  }, [claims]);

  // Calculate personal performance statistics
  const stats = useMemo(() => {
    const totalClaims = claims.length;
    
    const activeClaims = claims.filter(c => 
      c.status === 'pending' || c.status === 'submitted' || c.status === 'under_review'
    ).length;
    
    const completedClaims = claims.filter(c => 
      c.status === 'approved' || c.status === 'paid'
    ).length;
    
    const pendingActions = claims.filter(c => 
      c.status === 'submitted' || c.status === 'under_review'
    ).length;

    // Calculate month-over-month growth
    const currentMonthClaims = monthlyTrendData[monthlyTrendData.length - 1]?.claims || 0;
    const lastMonthClaims = monthlyTrendData[monthlyTrendData.length - 2]?.claims || 0;
    const claimsGrowth = lastMonthClaims > 0
      ? (((currentMonthClaims - lastMonthClaims) / lastMonthClaims) * 100).toFixed(1)
      : 0;

    return {
      totalClaims,
      activeClaims,
      completedClaims,
      pendingActions,
      claimsGrowth: Number(claimsGrowth),
    };
  }, [claims, monthlyTrendData]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusData = [
      { 
        name: 'Approved', 
        value: claims.filter(c => c.status === 'approved').length,
        color: COLORS.approved
      },
      { 
        name: 'Paid', 
        value: claims.filter(c => c.status === 'paid').length,
        color: COLORS.paid
      },
      { 
        name: 'Pending', 
        value: claims.filter(c => c.status === 'pending').length,
        color: COLORS.pending
      },
      { 
        name: 'Submitted', 
        value: claims.filter(c => c.status === 'submitted').length,
        color: COLORS.submitted
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
    ];
    
    return statusData.filter(item => item.value > 0);
  }, [claims]);

  // Recent activity - last 5 claims
  const recentClaims = useMemo(() => {
    return [...claims]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [claims]);

  // Stat cards configuration
  const statCards: StatCard[] = [
    {
      title: 'My Active Claims',
      value: stats.activeClaims.toLocaleString(),
      change: `${stats.totalClaims} total claims`,
      description: 'Claims in progress',
      icon: FileText,
      iconBgColor: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Pending Actions',
      value: stats.pendingActions.toLocaleString(),
      change: 'Awaiting review or approval',
      description: 'Requires your attention',
      icon: AlertCircle,
      iconBgColor: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Completed This Month',
      value: monthlyTrendData[monthlyTrendData.length - 1]?.claims || 0,
      change: `${stats.claimsGrowth >= 0 ? '+' : ''}${stats.claimsGrowth}% from last month`,
      description: 'Your monthly performance',
      icon: CheckCircle,
      iconBgColor: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total Completed',
      value: stats.completedClaims.toLocaleString(),
      change: 'Approved and paid claims',
      description: 'Lifetime completions',
      icon: TrendingUp,
      iconBgColor: 'bg-purple-100 text-purple-600',
    },
  ];

  if (claimsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Claims Yet</h3>
          <p className="text-gray-600">
            Create your first claim to see your performance dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Performance</h1>
        <p className="text-gray-600 mt-1">Track your claims and performance metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.iconBgColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Claims Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Claims Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="claims" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Claims"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={100}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
              </ResponsiveContainer>
              
            )
             
            : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No status data available
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {statusDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-700">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentClaims.map((claim) => (
              <Link 
                key={claim.id} 
                to={`/claims/${claim.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{claim.title}</p>
                    <p className="text-sm text-gray-500">
                      {claim.policy_types?.name} • {claim.claim_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(claim.updated_at), 'MMM dd')}
                  </div>
                </div>
              </Link>
            ))}
            {recentClaims.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};