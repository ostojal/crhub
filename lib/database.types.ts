export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          company: string | null;
          first_name: string;
          last_name: string;
          job_title: string | null;
          email: string | null;
          phone: string | null;
          mobile_phone: string | null;
          city: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company?: string | null;
          first_name: string;
          last_name: string;
          job_title?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile_phone?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company?: string | null;
          first_name?: string;
          last_name?: string;
          job_title?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile_phone?: string | null;
          city?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          user_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          contact_id?: string;
          user_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string;
          type: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          user_id: string;
          type: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          user_id?: string;
          type?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_status: {
        Row: {
          id: string;
          contact_id: string;
          communication_status: string | null;
          interest_tag: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          contact_id: string;
          communication_status?: string | null;
          interest_tag?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          contact_id?: string;
          communication_status?: string | null;
          interest_tag?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_status_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
