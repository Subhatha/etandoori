// Initial schema types; regenerate from Supabase after applying migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type OrderType = "delivery" | "pickup";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus = "new" | "accepted" | "preparing" | "ready" | "completed" | "rejected" | "cancelled";
export type RestaurantRole = "admin" | "staff";

export type Database = {
  public: {
    Tables: {
      menu_items: {
        Row: {
          id: string;
          name: Json;
          description: Json;
          category: string;
          price: number;
          image: string | null;
          available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: Json;
          description?: Json;
          category: string;
          price: number;
          image?: string | null;
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: Json;
          description?: Json;
          category?: string;
          price?: number;
          image?: string | null;
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          request_fingerprint: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          order_type: OrderType;
          delivery_address: string | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          payment_status: PaymentStatus;
          order_status: OrderStatus;
          payment_provider: string | null;
          payment_reference: string | null;
          customer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: never;
          request_fingerprint?: string | null;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          order_type: OrderType;
          delivery_address?: string | null;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          payment_status?: PaymentStatus;
          order_status?: OrderStatus;
          payment_provider?: string | null;
          payment_reference?: string | null;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: never;
          request_fingerprint?: string | null;
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          order_type?: OrderType;
          delivery_address?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          payment_status?: PaymentStatus;
          order_status?: OrderStatus;
          payment_provider?: string | null;
          payment_reference?: string | null;
          customer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          item_name: string;
          quantity: number;
          unit_price: number;
          total_price: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          item_name: string;
          quantity: number;
          unit_price: number;
          total_price?: never;
          notes?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          item_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: never;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_menu_item_id_fkey"; columns: ["menu_item_id"]; isOneToOne: false; referencedRelation: "menu_items"; referencedColumns: ["id"] },
        ];
      };
      restaurant_users: {
        Row: {
          id: string;
          auth_user_id: string;
          name: string;
          role: RestaurantRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          name: string;
          role?: RestaurantRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          name?: string;
          role?: RestaurantRole;
          created_at?: string;
        };
        Relationships: [
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: OrderStatus;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: OrderStatus;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: OrderStatus;
          changed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "order_status_history_order_id_fkey"; columns: ["order_id"]; isOneToOne: false; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_status_history_changed_by_fkey"; columns: ["changed_by"]; isOneToOne: false; referencedRelation: "restaurant_users"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_restaurant_order: {
        Args: { p_request_id: string; p_fingerprint: string; p_customer: Json; p_items: Json; p_delivery_fee: number; p_language: string };
        Returns: Json;
      };
    };
    Enums: {
      order_type: OrderType;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      restaurant_role: RestaurantRole;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
