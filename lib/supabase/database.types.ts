export type MemberStatus = "invited" | "joined";

export interface Profile {
  id: string;
  display_name: string;
  email: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  invited_email: string | null;
  display_name: string;
  status: MemberStatus;
  invited_by: string;
  created_at: string;
}

export interface Debt {
  id: string;
  group_id: string;
  creditor_member_id: string;
  debtor_member_id: string;
  amount: number;
  reason: string | null;
  payment_channel: string | null;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  created_by: string;
  created_at: string;
}

export interface MemberBalance {
  member_id: string;
  group_id: string;
  display_name: string;
  user_id: string | null;
  total_owed_to_them: number;
  unpaid_count: number;
  nearest_due_date: string | null;
}

// Minimal shape so `createBrowserClient<Database>()` / `createServerClient<Database>()`
// type-check. Extend with generated types (`supabase gen types typescript`) any time.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> };
      group_members: {
        Row: GroupMember;
        Insert: Partial<GroupMember>;
        Update: Partial<GroupMember>;
      };
      debts: { Row: Debt; Insert: Partial<Debt>; Update: Partial<Debt> };
    };
    Views: {
      member_balances: { Row: MemberBalance };
    };
  };
}
