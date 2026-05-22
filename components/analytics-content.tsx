'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const categoryData = [
  { name: 'Food', value: 5200, percentage: 42 },
  { name: 'Transport', value: 1800, percentage: 14 },
  { name: 'Entertainment', value: 2500, percentage: 20 },
  { name: 'Beverages', value: 1200, percentage: 10 },
  { name: 'Other', value: 1750, percentage: 14 },
];

const monthlyData = [
  { month: 'Jan', amount: 4200 },
  { month: 'Feb', amount: 5100 },
  { month: 'Mar', amount: 4800 },
  { month: 'Apr', amount: 6200 },
  { month: 'May', amount: 5900 },
  { month: 'Jun', amount: 7100 },
];

const COLORS = ['#14b8a6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

export function AnalyticsContent() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-2">Detailed insights into your team&apos;s expenses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
            <CardDescription>Expense trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(20, 184, 166, 0.1)' }}
                />
                <Bar dataKey="amount" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution of expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Detailed spending per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryData.map((category, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-card-foreground">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-card-foreground">₹{category.value}</p>
                  <p className="text-xs text-muted-foreground">{category.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
