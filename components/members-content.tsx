'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, Trash2 } from 'lucide-react';

const mockMembers = [
  { id: 1, name: 'You', email: 'you@example.com', balance: -8400, color: 'bg-blue-500' },
  { id: 2, name: 'Raj Kumar', email: 'raj@example.com', balance: 2100, color: 'bg-purple-500' },
  { id: 3, name: 'Priya Singh', email: 'priya@example.com', balance: 4200, color: 'bg-green-500' },
  { id: 4, name: 'Amit Patel', email: 'amit@example.com', balance: 1800, color: 'bg-orange-500' },
  { id: 5, name: 'Sarah Johnson', email: 'sarah@example.com', balance: -500, color: 'bg-pink-500' },
  { id: 6, name: 'Mike Chen', email: 'mike@example.com', balance: 900, color: 'bg-cyan-500' },
];

export function MembersContent() {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground mt-2">Manage your team and view balance details.</p>
        </div>
        <Button className="w-full md:w-auto gap-2">
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockMembers.map((member) => (
          <Card key={member.id} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={member.color + ' text-white font-semibold'}>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-card-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className={`p-3 rounded-lg ${member.balance < 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <p className="text-xs text-muted-foreground mb-1">Balance</p>
                <p className={`text-lg font-bold ${member.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ₹{Math.abs(member.balance).toLocaleString('en-IN')}{member.balance < 0 ? ' owed' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
