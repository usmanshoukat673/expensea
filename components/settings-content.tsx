'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Lock, Share2, Trash2 } from 'lucide-react';

export function SettingsContent() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and team preferences.</p>
      </div>

      {/* Account Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            Account Settings
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="Your name" defaultValue="Your Name" className="mt-2 bg-muted border-border" />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="your@email.com" defaultValue="you@example.com" className="mt-2 bg-muted border-border" />
          </div>
          <Button className="mt-4">Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Notifications
          </CardTitle>
          <CardDescription>Control how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-card-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Get updates about expenses and settlements</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium text-card-foreground">Weekly Digest</p>
              <p className="text-sm text-muted-foreground">Receive a weekly summary of expenses</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-card-foreground">Expense Reminders</p>
              <p className="text-sm text-muted-foreground">Get reminded about unsettled expenses</p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Sharing Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-accent" />
            Public Sharing
          </CardTitle>
          <CardDescription>Share your team expenses publicly with a link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Team expense link</Label>
            <div className="flex gap-2 mt-2">
              <Input 
                readOnly 
                value="expensea.app/public/team-12345" 
                className="bg-muted border-border"
              />
              <Button variant="outline" size="sm">Copy</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Share this link to let others view your team&apos;s expenses</p>
          </div>
          <Button variant="outline">Generate New Link</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-card border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="w-full sm:w-auto">
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground mt-4">This action cannot be undone. All your data will be permanently deleted.</p>
        </CardContent>
      </Card>
    </div>
  );
}
