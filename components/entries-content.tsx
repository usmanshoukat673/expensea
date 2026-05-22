'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, Download } from 'lucide-react';

const mockEntries = [
  { id: 1, description: 'Team expense', amount: 450, paidBy: 'You', category: 'Food', date: '2024-05-19', participants: ['You', 'Raj', 'Priya'] },
  { id: 2, description: 'Coffee Break', amount: 120, paidBy: 'Raj', category: 'Beverages', date: '2024-05-19', participants: ['You', 'Raj'] },
  { id: 3, description: 'Movie Tickets', amount: 1500, paidBy: 'Priya', category: 'Entertainment', date: '2024-05-18', participants: ['You', 'Priya', 'Amit'] },
  { id: 4, description: 'Dinner', amount: 2400, paidBy: 'You', category: 'Food', date: '2024-05-17', participants: ['You', 'Raj', 'Priya', 'Amit'] },
  { id: 5, description: 'Cab Ride', amount: 320, paidBy: 'Amit', category: 'Transport', date: '2024-05-17', participants: ['You', 'Amit'] },
  { id: 6, description: 'Groceries', amount: 850, paidBy: 'You', category: 'Food', date: '2024-05-16', participants: ['You', 'Raj'] },
];

export function EntriesContent() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Entries</h1>
          <p className="text-muted-foreground mt-2">Manage all your shared expenses in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Entries Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>All expenses from your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Paid By</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-card-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.participants.join(', ')}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-card-foreground">₹{entry.amount}</td>
                    <td className="py-3 px-4 text-muted-foreground">{entry.paidBy}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-muted rounded text-xs font-medium text-muted-foreground">{entry.category}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{entry.date}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
