// Base Audit Fields Interface
export interface AuditFields {
  created_by: string;
  created_at: Date;
  updated_by?: string;
  updated_at?: Date;
}

// Document Audit Fields (includes confirmation and cancellation)
export interface DocumentAuditFields extends AuditFields {
  confirmed_by?: string;
  confirmed_at?: Date;
  cancelled_by?: string;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

// Soft Delete Fields
export interface SoftDeleteFields {
  is_deleted: boolean;
  deleted_by?: string;
  deleted_at?: Date;
}
