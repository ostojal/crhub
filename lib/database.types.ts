export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Ogledalo stvarne šeme (provereno kroz PostgREST OpenAPI):
// - svi id-jevi su bigint (number), ne uuid
// - communication_status i interest_tag su Postgres enumi
// - tekstualne kolone imaju default '' i nullable su, pa "prazno" može
//   biti i '' i null
export type CommunicationStatus =
  | "Nije kontaktiran"
  | "Poslato"
  | "Poslati follow up"
  | "Poslat follow up"
  | "Dobijen odgovor"
  | "Na čekanju"
  | "Prihvaćeno"
  | "Odbijeno";

export type InterestTag = "Bili zainteresovani" | "Za sledeći projekat";

// Tabele za mejlove (db/emails.sql) — status je text sa CHECK ograničenjem,
// ne Postgres enum
export type EmailStatus =
  "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          email: string | null;
          full_name: string | null;
          role: string | null;
          email_signature: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          email_signature?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          email_signature?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // Globalna podešavanja, logički jedan red (db/follow-up.sql)
      app_settings: {
        Row: {
          id: boolean;
          follow_up_enabled: boolean;
          follow_up_days: number;
          call_reminder_enabled: boolean;
          call_reminder_days: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          follow_up_enabled?: boolean;
          follow_up_days?: number;
          call_reminder_enabled?: boolean;
          call_reminder_days?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          follow_up_enabled?: boolean;
          follow_up_days?: number;
          call_reminder_enabled?: boolean;
          call_reminder_days?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: number;
          company: string | null;
          first_name: string | null;
          last_name: string | null;
          job_title: string | null;
          email: string | null;
          phone: string | null;
          mobile_phone: string | null;
          city: string | null;
          category: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          company?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          job_title?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile_phone?: string | null;
          city?: string | null;
          category?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          company?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          job_title?: string | null;
          email?: string | null;
          phone?: string | null;
          mobile_phone?: string | null;
          city?: string | null;
          category?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: number;
          contact_id: number | null;
          user_id: number | null;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: number;
          contact_id?: number | null;
          user_id?: number | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: number;
          contact_id?: number | null;
          user_id?: number | null;
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
          id: number;
          contact_id: number | null;
          user_id: number | null;
          type: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          contact_id?: number | null;
          user_id?: number | null;
          type?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          contact_id?: number | null;
          user_id?: number | null;
          type?: string | null;
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
          id: number;
          contact_id: number | null;
          communication_status: CommunicationStatus | null;
          interest_tag: InterestTag | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          contact_id?: number | null;
          communication_status?: CommunicationStatus | null;
          interest_tag?: InterestTag | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          contact_id?: number | null;
          communication_status?: CommunicationStatus | null;
          interest_tag?: InterestTag | null;
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
      google_tokens: {
        Row: {
          id: number;
          user_id: number;
          google_email: string;
          refresh_token_enc: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          google_email: string;
          refresh_token_enc: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          google_email?: string;
          refresh_token_enc?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_templates: {
        Row: {
          id: number;
          name: string;
          subject: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          subject: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          subject?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachment_templates: {
        Row: {
          id: number;
          name: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          storage_path?: string;
          mime_type?: string;
          size_bytes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cc_bcc_options: {
        Row: {
          id: number;
          email: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          email: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          email?: string;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      emails: {
        Row: {
          id: number;
          contact_id: number | null;
          user_id: number;
          to_email: string;
          cc: string[];
          bcc: string[];
          subject: string;
          body: string;
          attachment_ids: number[];
          status: EmailStatus;
          scheduled_at: string;
          claimed_at: string | null;
          sent_at: string | null;
          gmail_message_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          contact_id?: number | null;
          user_id: number;
          to_email: string;
          cc?: string[];
          bcc?: string[];
          subject: string;
          body: string;
          attachment_ids?: number[];
          status?: EmailStatus;
          scheduled_at?: string;
          claimed_at?: string | null;
          sent_at?: string | null;
          gmail_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          contact_id?: number | null;
          user_id?: number;
          to_email?: string;
          cc?: string[];
          bcc?: string[];
          subject?: string;
          body?: string;
          attachment_ids?: number[];
          status?: EmailStatus;
          scheduled_at?: string;
          claimed_at?: string | null;
          sent_at?: string | null;
          gmail_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emails_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      status: CommunicationStatus;
      tag: InterestTag;
    };
    CompositeTypes: Record<string, never>;
  };
}
