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
  | "Dobijen odgovor"
  | "Na čekanju"
  | "Prihvaćeno"
  | "Odbijeno";

export type InterestTag = "Bili zainteresovani" | "Za sledeći projekat";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number;
          email: string | null;
          full_name: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
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
