export type TeamRole = 'owner' | 'admin' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type PaymentStatus = 'paid' | 'unpaid';
export type ProfileStatus = 'active' | 'inactive';
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
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['lunch_entries']['Insert']>;
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
    };
    Enums: {
      team_role: TeamRole;
      invitation_status: InvitationStatus;
      payment_status: PaymentStatus;
      profile_status: ProfileStatus;
      member_status: MemberStatus;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type TeamInvitation = Database['public']['Tables']['team_invitations']['Row'];
export type TeamInvite = Database['public']['Tables']['team_invites']['Row'];
export type LunchEntry = Database['public']['Tables']['lunch_entries']['Row'];
export type MonthlySummary = Database['public']['Tables']['monthly_summaries']['Row'];
export type TeamActivity = Database['public']['Tables']['team_activity_log']['Row'];

export type LunchEntryWithProfile = LunchEntry & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
};

export type TeamMemberWithProfile = TeamMember & {
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
};
