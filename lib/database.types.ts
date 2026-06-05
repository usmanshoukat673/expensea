export type TeamRole = 'owner' | 'admin' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type PaymentStatus = 'paid' | 'unpaid';
export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'reimbursed';
export type ReimbursementStatus = 'not_reimbursed' | 'partially_reimbursed' | 'fully_reimbursed';
export type ProfileStatus = 'active' | 'inactive';
export type SettlementStatus = 'pending' | 'completed' | 'cancelled';
export type ExpenseSplitType = 'none' | 'equal' | 'selected';
export type BudgetType = 'monthly' | 'category';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ExpenseAssignmentType = 'team' | 'individual';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          status?: ProfileStatus;
          team_id: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'profiles_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          is_public: boolean;
          currency?: string;
          brand_name?: string | null;
          logo_url?: string | null;
          created_by?: string | null;
          show_balances_on_public?: boolean;
          show_category_analytics_on_public?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          owner_id: string;
          is_public?: boolean;
          currency?: string;
          brand_name?: string | null;
          logo_url?: string | null;
          created_by?: string;
        };
        Update: Partial<Database['public']['Tables']['teams']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'teams_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: TeamRole;
          status?: MemberStatus;
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: TeamRole;
          status?: MemberStatus;
        };
        Update: { role?: TeamRole; status?: MemberStatus };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_user_id_profiles_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      team_invitations: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          role: TeamRole;
          invited_by: string;
          status: InvitationStatus;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          email: string;
          role?: TeamRole;
          invited_by: string;
        };
        Update: Partial<Database['public']['Tables']['team_invitations']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'expense_categories_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      team_invites: {
        Row: {
          id: string;
          token: string;
          team_id: string;
          invited_email: string | null;
          role: TeamRole;
          expires_at: string | null;
          usage_limit: number | null;
          usage_count: number;
          is_active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          role?: TeamRole;
          expires_at?: string | null;
          invited_email?: string | null;
          usage_limit?: number | null;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['team_invites']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'lunch_entries_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lunch_entries_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: true;
            referencedRelation: 'expense_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lunch_entries_user_id_profiles_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      expense_categories: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          slug: string;
          icon: string;
          color: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          team_id: string;
          name: string;
          slug: string;
          icon?: string;
          color?: string;
          description?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'lunch_entry_participants_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'lunch_entries';
            referencedColumns: ['id'];
          },
        ];
      };
      lunch_entries: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          amount: number;
          lunch_date: string;
          notes: string | null;
          payment_status: PaymentStatus;
          approval_status: ApprovalStatus;
          submitted_by: string | null;
          approved_by: string | null;
          approved_at: string | null;
          rejection_reason: string | null;
          reimbursement_status: ReimbursementStatus;
          amount_reimbursed: number;
          reimbursed_at: string | null;
          reimbursement_notes: string | null;
          category_id: string | null;
          recurring_expense_id: string | null;
          assigned_user_id: string | null;
          assigned_by: string | null;
          assignment_type: ExpenseAssignmentType;
          is_shared: boolean;
          split_type: ExpenseSplitType;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          amount: number;
          lunch_date?: string;
          notes?: string | null;
          payment_status?: PaymentStatus;
          approval_status?: ApprovalStatus;
          submitted_by?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejection_reason?: string | null;
          reimbursement_status?: ReimbursementStatus;
          amount_reimbursed?: number;
          reimbursed_at?: string | null;
          reimbursement_notes?: string | null;
          category_id?: string | null;
          recurring_expense_id?: string | null;
          assigned_user_id?: string | null;
          assigned_by?: string | null;
          assignment_type?: ExpenseAssignmentType;
          is_shared?: boolean;
          split_type?: ExpenseSplitType;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['lunch_entries']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'settlements_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      recurring_expenses: {
        Row: {
          id: string;
          team_id: string;
          created_by: string;
          title: string;
          amount: number;
          category_id: string;
          frequency: RecurringFrequency;
          interval_value: number;
          start_date: string;
          end_date: string | null;
          next_run_date: string;
          is_active: boolean;
          last_generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          created_by: string;
          title: string;
          amount: number;
          category_id: string;
          frequency: RecurringFrequency;
          interval_value?: number;
          start_date: string;
          end_date?: string | null;
          next_run_date: string;
          is_active?: boolean;
          last_generated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['recurring_expenses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'recurring_expenses_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_expenses_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'expense_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      lunch_entry_participants: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          share_amount: number | null;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          user_id: string;
          share_amount?: number | null;
        };
        Update: { share_amount?: number | null };
        Relationships: [
          {
            foreignKeyName: 'team_budgets_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: true;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_budgets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: true;
            referencedRelation: 'expense_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      settlements: {
        Row: {
          id: string;
          team_id: string;
          payer_user_id: string;
          receiver_user_id: string;
          amount: number;
          status: SettlementStatus;
          note: string | null;
          proof_url: string | null;
          settled_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          payer_user_id: string;
          receiver_user_id: string;
          amount: number;
          status?: SettlementStatus;
          note?: string | null;
          proof_url?: string | null;
          settled_at?: string | null;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['settlements']['Insert']>;
        Relationships: [];
      };
      team_budgets: {
        Row: {
          id: string;
          team_id: string;
          category_id: string | null;
          type: BudgetType;
          amount: number;
          currency: string;
          month: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          team_id: string;
          category_id?: string | null;
          type: BudgetType;
          amount: number;
          currency?: string;
          month?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['team_budgets']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          type: string;
          title: string;
          body: string | null;
          message: string | null;
          link: string | null;
          metadata: Record<string, unknown>;
          read_at: string | null;
          read: boolean;
          is_read: boolean;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          team_id: string;
          type: string;
          title: string;
          body?: string | null;
          message?: string | null;
          link?: string | null;
          metadata?: Record<string, unknown>;
          read?: boolean;
          is_read?: boolean;
          archived_at?: string | null;
        };
        Update: {
          read_at?: string | null;
          read?: boolean;
          is_read?: boolean;
          message?: string | null;
          body?: string | null;
          link?: string | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      monthly_summaries: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          month: string;
          total_amount: number;
          paid_amount: number;
          pending_amount: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          team_id: string;
          month: string;
          total_amount?: number;
          paid_amount?: number;
          pending_amount?: number;
        };
        Update: Partial<Database['public']['Tables']['monthly_summaries']['Row']>;
        Relationships: [];
      };
      team_activity_log: {
        Row: {
          id: string;
          team_id: string;
          user_id: string | null;
          action: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id?: string | null;
          action: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['team_activity_log']['Insert']>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          team_id: string;
          user_id: string | null;
          action_type: string;
          entity_type: string;
          entity_id: string | null;
          message: string;
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id?: string | null;
          action_type: string;
          entity_type: string;
          entity_id?: string | null;
          message: string;
          description?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>;
        Relationships: [];
      };
      user_dashboard_preferences: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          layout_json: Json;
          hidden_widgets: Json;
          pinned_widgets: Json;
          default_view_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          layout_json?: Json;
          hidden_widgets?: Json;
          pinned_widgets?: Json;
          default_view_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_dashboard_preferences']['Insert']>;
        Relationships: [];
      };
      dashboard_saved_views: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          name: string;
          layout_json: Json;
          hidden_widgets: Json;
          pinned_widgets: Json;
          filters_json: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          name: string;
          layout_json?: Json;
          hidden_widgets?: Json;
          pinned_widgets?: Json;
          filters_json?: Json;
          is_default?: boolean;
        };
        Update: Partial<Database['public']['Tables']['dashboard_saved_views']['Insert']>;
        Relationships: [];
      };
      dashboard_favorites: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          favorite_type: 'report' | 'category' | 'team' | 'dashboard';
          favorite_id: string | null;
          label: string;
          href: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          favorite_type: 'report' | 'category' | 'team' | 'dashboard';
          favorite_id?: string | null;
          label: string;
          href?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['dashboard_favorites']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_team_invite_preview: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_team_role: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: TeamRole;
      };
      can_edit_team: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_team_member: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: boolean;
      };
      process_due_recurring_expenses: {
        Args: { p_team_id?: string | null; p_run_date?: string };
        Returns: {
          recurring_expense_id: string;
          expense_id: string;
          team_id: string;
          title: string;
          amount: number;
          generated_for: string;
        }[];
      };
    };
    Enums: {
      team_role: TeamRole;
      invitation_status: InvitationStatus;
      payment_status: PaymentStatus;
      approval_status: ApprovalStatus;
      profile_status: ProfileStatus;
      reimbursement_status: ReimbursementStatus;
      member_status: MemberStatus;
      settlement_status: SettlementStatus;
      expense_split_type: ExpenseSplitType;
      expense_assignment_type: ExpenseAssignmentType;
      budget_type: BudgetType;
      recurring_frequency: RecurringFrequency;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type TeamInvitation = Database['public']['Tables']['team_invitations']['Row'];
export type TeamInvite = Database['public']['Tables']['team_invites']['Row'];
export type LunchEntry = Database['public']['Tables']['lunch_entries']['Row'];
export type RecurringExpense = Database['public']['Tables']['recurring_expenses']['Row'];
export type MonthlySummary = Database['public']['Tables']['monthly_summaries']['Row'];
export type TeamActivity = Database['public']['Tables']['team_activity_log']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type UserDashboardPreference = Database['public']['Tables']['user_dashboard_preferences']['Row'];
export type DashboardSavedView = Database['public']['Tables']['dashboard_saved_views']['Row'];
export type DashboardFavorite = Database['public']['Tables']['dashboard_favorites']['Row'];

export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type TeamBudget = Database['public']['Tables']['team_budgets']['Row'] & {
  expense_categories?: Pick<ExpenseCategory, 'id' | 'name' | 'icon' | 'color'> | null;
};
export type Settlement = Database['public']['Tables']['settlements']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export type LunchEntryWithProfile = LunchEntry & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  expense_categories?: Pick<ExpenseCategory, 'id' | 'name' | 'icon' | 'color' | 'slug'> | null;
  lunch_entry_participants?: { user_id: string; share_amount: number | null }[];
};

export type RecurringExpenseWithCategory = RecurringExpense & {
  expense_categories?: Pick<ExpenseCategory, 'id' | 'name' | 'icon' | 'color' | 'slug'> | null;
};

export type SettlementWithProfiles = Settlement & {
  payer?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  receiver?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
};

export type TeamMemberWithProfile = TeamMember & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
};
