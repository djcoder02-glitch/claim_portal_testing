import { useState, useMemo } from 'react';
import { useClaims } from '@/hooks/useClaims';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, DollarSign, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B9D', '#C084FC'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30');
  const { data: allClaims, isLoading } = useClaims();

  // Filter claims by date range
  const filteredClaims = useMemo(() => {
    if (!allClaims) return [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return allClaims.filter(claim => 
      new Date(claim.created_at) >= startDate
    );
  }, [allClaims, dateRange]);

  // Overall claims statistics
  const claimsOverview = useMemo(() => {
    const total = filteredClaims.length;
    const accepted = filteredClaims.filter(c => 
      c.status === 'approved' || c.status === 'paid'
    ).length;
    const rejected = filteredClaims.filter(c => c.status === 'rejected').length;
    const pending = filteredClaims.filter(c => c.status === 'pending').length;
    const totalAmount = filteredClaims.reduce((sum, c) => 
      sum + (parseFloat(c.claim_amount as any) || 0), 0
    );
    const avgAmount = total > 0 ? totalAmount / total : 0;
    return { total, accepted, rejected, pending, totalAmount, avgAmount };
  }, [filteredClaims]);

  // Claims by type (count + amount)
  const claimsByType = useMemo(() => {
    const typeMap = new Map();
    filteredClaims.forEach(claim => {
      const type = claim.policy_types?.name || 'Unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, { name: type, count: 0, amount: 0 });
      }
      const stats = typeMap.get(type);
      stats.count++;
      stats.amount += parseFloat(claim.claim_amount as any) || 0;
    });
    return Array.from(typeMap.values());
  }, [filteredClaims]);

  // Claims timeline (daily)
  const claimsTimeline = useMemo(() => {
    const dateMap = new Map();
    filteredClaims.forEach(claim => {
      const date = new Date(claim.created_at).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric' 
      });
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, claims: 0, amount: 0, accepted: 0, rejected: 0 });
      }
      const stats = dateMap.get(date);
      stats.claims++;
      stats.amount += parseFloat(claim.claim_amount as any) || 0;
      if (claim.status === 'approved' || claim.status === 'paid') stats.accepted++;
      if (claim.status === 'rejected') stats.rejected++;
    });
    return Array.from(dateMap.values());
  }, [filteredClaims]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const statusMap = new Map();
    filteredClaims.forEach(claim => {
      const status = claim.status || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    return Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredClaims]);

  // Claim amount ranges
  const amountRanges = useMemo(() => {
    const ranges = [
      { name: '0-50K', min: 0, max: 50000, count: 0 },
      { name: '50K-1L', min: 50000, max: 100000, count: 0 },
      { name: '1L-5L', min: 100000, max: 500000, count: 0 },
      { name: '5L-10L', min: 500000, max: 1000000, count: 0 },
      { name: '10L+', min: 1000000, max: Infinity, count: 0 }
    ];
    filteredClaims.forEach(claim => {
      const amount = parseFloat(claim.claim_amount as any) || 0;
      const range = ranges.find(r => amount >= r.min && amount < r.max);
      if (range) range.count++;
    });
    return ranges.filter(r => r.count > 0);
  }, [filteredClaims]);

  // Top claims by amount
  const topClaims = useMemo(() => {
    return [...filteredClaims]
      .sort((a, b) => (parseFloat(b.claim_amount as any) || 0) - (parseFloat(a.claim_amount as any) || 0))
      .slice(0, 10);
  }, [filteredClaims]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Claims Analytics</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claimsOverview?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Claims filed in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claim Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(claimsOverview?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Avg: {formatCurrency(claimsOverview?.avgAmount || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted Claims</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{claimsOverview?.accepted || 0}</div>
            <p className="text-xs text-muted-foreground">
              {claimsOverview?.total ? ((claimsOverview.accepted / claimsOverview.total) * 100).toFixed(1) : 0}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Claims</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{claimsOverview?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">
              {claimsOverview?.total ? ((claimsOverview.rejected / claimsOverview.total) * 100).toFixed(1) : 0}% rejection rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">Claim Types</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="amounts">Amount Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Claims by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${formatStatus(name)}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Claims Count</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={claimsTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="claims" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Claims" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Highest Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Claim No</th>
                      <th className="text-left p-2">Policy Type</th>
                      <th className="text-right p-2">Claim Amount</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-right p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClaims?.map((claim, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2">{claim.claim_number}</td>
                        <td className="p-2">{claim.policy_types?.name || 'N/A'}</td>
                        <td className="text-right p-2 font-semibold">{formatCurrency(parseFloat(claim.claim_amount as any) || 0)}</td>
                        <td className="text-center p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            claim.status === 'approved' || claim.status === 'paid' ? 'bg-green-100 text-green-800' :
                            claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formatStatus(claim.status)}
                          </span>
                        </td>
                        <td className="text-right p-2">{new Date(claim.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Claims Count by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={claimsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" name="Claims Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Amount by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={claimsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill="#00C49F" name="Total Amount (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Policy Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Policy Type</th>
                      <th className="text-right p-2">Claims Count</th>
                      <th className="text-right p-2">Total Amount</th>
                      <th className="text-right p-2">Average Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimsByType?.map((type, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{type.name}</td>
                        <td className="text-right p-2">{type.count}</td>
                        <td className="text-right p-2">{formatCurrency(type.amount)}</td>
                        <td className="text-right p-2">{formatCurrency(type.amount / type.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Trend Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={claimsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="claims" stroke="#8884d8" name="Total Claims" strokeWidth={2} />
                  <Line type="monotone" dataKey="accepted" stroke="#82ca9d" name="Accepted" strokeWidth={2} />
                  <Line type="monotone" dataKey="rejected" stroke="#ff8042" name="Rejected" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim Amount Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={claimsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" name="Daily Total Amount (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims by Amount Range</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={amountRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FFBB28" name="Number of Claims" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amount Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={amountRanges}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {amountRanges?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}