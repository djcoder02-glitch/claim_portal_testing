import { useState, useMemo } from 'react';
import { useClaims } from '@/hooks/useClaims';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B9D', '#C084FC'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30');

  const { data: allClaims, isLoading } = useClaims();

  // Apply date filter only
  const filteredClaims = useMemo(() => {
    if (!allClaims) return [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return allClaims.filter(claim => new Date(claim.created_at) >= startDate);
  }, [allClaims, dateRange]);

  // Statistical calculations
  const statistics = useMemo(() => {
    if (!filteredClaims.length) return null;

    const amounts = filteredClaims.map(c => parseFloat(c.claim_amount as any) || 0);
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    
    // Calculate duration (days from created to updated/now)
    const durations = filteredClaims.map(c => {
      const start = new Date(c.created_at);
      const end = c.updated_at ? new Date(c.updated_at) : new Date();
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    const sortedDurations = [...durations].sort((a, b) => a - b);

    // Mode calculation
    const amountMode = amounts.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const amountModeEntry = Object.entries(amountMode).sort((a, b) => b[1] - a[1])[0];
    const amountModeValue = amountModeEntry ? parseFloat(amountModeEntry[0]) : 0;

    return {
      amount: {
        min: Math.min(...amounts),
        max: Math.max(...amounts),
        avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
        median: sortedAmounts[Math.floor(sortedAmounts.length / 2)],
        mode: amountModeValue,
        total: amounts.reduce((a, b) => a + b, 0)
      },
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: sortedDurations[Math.floor(sortedDurations.length / 2)]
      },
      count: filteredClaims.length
    };
  }, [filteredClaims]);

  // Group by dimensions
  const analyticsData = useMemo(() => {
    const bySurveyor = new Map();
    const byInsurer = new Map();
    const byType = new Map();

    filteredClaims.forEach(claim => {
      const amount = parseFloat(claim.claim_amount as any) || 0;
      
      // By Surveyor
      const surveyorName = (claim as any).surveyor_name || (claim as any).surveyor || 'Unassigned';
      if (!bySurveyor.has(surveyorName)) {
        bySurveyor.set(surveyorName, { name: surveyorName, amounts: [], count: 0 });
      }
      bySurveyor.get(surveyorName).amounts.push(amount);
      bySurveyor.get(surveyorName).count++;

      // By Insurer
      const insurerName = (claim as any).insurer_name || (claim as any).insurer || 'Unknown';
      if (!byInsurer.has(insurerName)) {
        byInsurer.set(insurerName, { name: insurerName, amounts: [], count: 0 });
      }
      byInsurer.get(insurerName).amounts.push(amount);
      byInsurer.get(insurerName).count++;

      // By Type
      const typeName = claim.policy_types?.name || 'Unknown';
      if (!byType.has(typeName)) {
        byType.set(typeName, { name: typeName, amounts: [], count: 0 });
      }
      byType.get(typeName).amounts.push(amount);
      byType.get(typeName).count++;
    });

    // Calculate stats for each group
    const calculateGroupStats = (groups: Map<any, any>) => {
      return Array.from(groups.values()).map(group => ({
        name: group.name,
        count: group.count,
        total: group.amounts.reduce((a: number, b: number) => a + b, 0),
        avg: group.amounts.reduce((a: number, b: number) => a + b, 0) / group.amounts.length,
        min: Math.min(...group.amounts),
        max: Math.max(...group.amounts)
      }));
    };

    return {
      surveyors: calculateGroupStats(bySurveyor),
      insurers: calculateGroupStats(byInsurer),
      types: calculateGroupStats(byType)
    };
  }, [filteredClaims]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Advanced Claims Analytics</h1>
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

      {/* Statistical Overview Cards */}
      {statistics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.count}</div>
                <p className="text-xs text-muted-foreground">Filtered results</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(statistics.amount.total)}</div>
                <p className="text-xs text-muted-foreground">Sum of all claims</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(statistics.amount.avg)}</div>
                <p className="text-xs text-muted-foreground">Mean claim value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Median Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(statistics.amount.median)}</div>
                <p className="text-xs text-muted-foreground">Middle claim value</p>
              </CardContent>
            </Card>
          </div>

          {/* Amount Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  Minimum Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(statistics.amount.min)}</div>
                <p className="text-xs text-muted-foreground">Lowest claim value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Maximum Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.amount.max)}</div>
                <p className="text-xs text-muted-foreground">Highest claim value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Minus className="h-4 w-4 text-purple-600" />
                  Mode Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(statistics.amount.mode)}</div>
                <p className="text-xs text-muted-foreground">Most frequent value</p>
              </CardContent>
            </Card>
          </div>

          {/* Duration Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Duration Statistics (Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Min Duration</p>
                  <p className="text-2xl font-bold">{statistics.duration.min}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Duration</p>
                  <p className="text-2xl font-bold">{statistics.duration.max}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">{statistics.duration.avg.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Median Duration</p>
                  <p className="text-2xl font-bold">{statistics.duration.median}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="amount" className="space-y-4">
        <TabsList>
          <TabsTrigger value="amount">Amount</TabsTrigger>
          <TabsTrigger value="duration">Duration</TabsTrigger>
          <TabsTrigger value="surveyors">Surveyors</TabsTrigger>
          <TabsTrigger value="insurers">Insurers</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        {/* Amount Tab */}
        <TabsContent value="amount" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Minimum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(statistics?.amount.min || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Maximum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics?.amount.max || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(statistics?.amount.avg || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Median</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(statistics?.amount.median || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Amount Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Min', value: statistics?.amount.min || 0 },
                  { name: 'Avg', value: statistics?.amount.avg || 0 },
                  { name: 'Median', value: statistics?.amount.median || 0 },
                  { name: 'Mode', value: statistics?.amount.mode || 0 },
                  { name: 'Max', value: statistics?.amount.max || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Surveyor</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredClaims]
                      .sort((a, b) => (parseFloat(b.claim_amount as any) || 0) - (parseFloat(a.claim_amount as any) || 0))
                      .slice(0, 10)
                      .map((claim, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2">{claim.claim_number}</td>
                          <td className="p-2">{claim.policy_types?.name || 'N/A'}</td>
                          <td className="p-2">{(claim as any).surveyor_name || (claim as any).surveyor || 'Unassigned'}</td>
                          <td className="text-right p-2 font-semibold">{formatCurrency(parseFloat(claim.claim_amount as any) || 0)}</td>
                          <td className="text-right p-2">{new Date(claim.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Min Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics?.duration.min || 0} days</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Max Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics?.duration.max || 0} days</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{statistics?.duration.avg.toFixed(1) || 0} days</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Median Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics?.duration.median || 0} days</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Duration Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Min', value: statistics?.duration.min || 0 },
                  { name: 'Avg', value: statistics?.duration.avg || 0 },
                  { name: 'Median', value: statistics?.duration.median || 0 },
                  { name: 'Max', value: statistics?.duration.max || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${(value as number).toFixed(1)} days`} />
                  <Bar dataKey="value" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claims by Duration Range</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={
                  (() => {
                    const ranges = [
                      { name: '0-7 days', min: 0, max: 7, count: 0 },
                      { name: '8-30 days', min: 8, max: 30, count: 0 },
                      { name: '31-60 days', min: 31, max: 60, count: 0 },
                      { name: '61-90 days', min: 61, max: 90, count: 0 },
                      { name: '90+ days', min: 91, max: Infinity, count: 0 }
                    ];
                    filteredClaims.forEach(claim => {
                      const start = new Date(claim.created_at);
                      const end = claim.updated_at ? new Date(claim.updated_at) : new Date();
                      const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      const range = ranges.find(r => duration >= r.min && duration <= r.max);
                      if (range) range.count++;
                    });
                    return ranges;
                  })()
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884D8" name="Number of Claims" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveyors Tab */}
        <TabsContent value="surveyors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Claims per Surveyor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.surveyors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" name="Claims Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Amount per Surveyor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.surveyors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="total" fill="#00C49F" name="Total Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Amount per Surveyor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.surveyors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="avg" fill="#FFBB28" name="Average Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Surveyor Statistics - Min/Max/Avg</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.surveyors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="min" fill="#0088FE" name="Min" />
                  <Bar dataKey="avg" fill="#00C49F" name="Avg" />
                  <Bar dataKey="max" fill="#FF8042" name="Max" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Surveyor Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Surveyor</th>
                      <th className="text-right p-2">Claims</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Average</th>
                      <th className="text-right p-2">Min</th>
                      <th className="text-right p-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.surveyors.map((surveyor, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{surveyor.name}</td>
                        <td className="text-right p-2">{surveyor.count}</td>
                        <td className="text-right p-2">{formatCurrency(surveyor.total)}</td>
                        <td className="text-right p-2">{formatCurrency(surveyor.avg)}</td>
                        <td className="text-right p-2">{formatCurrency(surveyor.min)}</td>
                        <td className="text-right p-2">{formatCurrency(surveyor.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurers Tab */}
        <TabsContent value="insurers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Claims per Insurer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.insurers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FFBB28" name="Claims Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Amount per Insurer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.insurers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="total" fill="#FF8042" name="Total Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Amount per Insurer</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.insurers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="avg" fill="#8884D8" name="Average Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insurer Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analyticsData.insurers}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.insurers.map((entry, index) => (
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
              <CardTitle>Detailed Insurer Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Insurer</th>
                      <th className="text-right p-2">Claims</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Average</th>
                      <th className="text-right p-2">Min</th>
                      <th className="text-right p-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.insurers.map((insurer, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{insurer.name}</td>
                        <td className="text-right p-2">{insurer.count}</td>
                        <td className="text-right p-2">{formatCurrency(insurer.total)}</td>
                        <td className="text-right p-2">{formatCurrency(insurer.avg)}</td>
                        <td className="text-right p-2">{formatCurrency(insurer.min)}</td>
                        <td className="text-right p-2">{formatCurrency(insurer.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Claims per Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.types}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82CA9D" name="Claims Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Amount per Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.types}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="total" fill="#C084FC" name="Total Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Amount per Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.types}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="avg" fill="#FF6B9D" name="Average Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Type Statistics - Min/Max/Avg</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.types}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="min" fill="#0088FE" name="Min" />
                  <Bar dataKey="avg" fill="#00C49F" name="Avg" />
                  <Bar dataKey="max" fill="#FF8042" name="Max" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analyticsData.types}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.types.map((entry, index) => (
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
              <CardTitle>Detailed Type Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Policy Type</th>
                      <th className="text-right p-2">Claims</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Average</th>
                      <th className="text-right p-2">Min</th>
                      <th className="text-right p-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.types.map((type, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{type.name}</td>
                        <td className="text-right p-2">{type.count}</td>
                        <td className="text-right p-2">{formatCurrency(type.total)}</td>
                        <td className="text-right p-2">{formatCurrency(type.avg)}</td>
                        <td className="text-right p-2">{formatCurrency(type.min)}</td>
                        <td className="text-right p-2">{formatCurrency(type.max)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}