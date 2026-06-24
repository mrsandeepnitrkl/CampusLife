/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  STUDENT = "student",
  ADMIN = "admin"
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

export enum ComplaintStatus {
  SUBMITTED = "Submitted",
  UNDER_REVIEW = "Under Review",
  ASSIGNED = "Assigned",
  IN_PROGRESS = "In Progress",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
  REJECTED = "Rejected"
}

export interface User {
  id: string;
  user_id: string; // The login ID
  name: string;
  email: string;
  department: string;
  password_hash: string;
  role: UserRole;
  status: "active" | "inactive";
  created_at: string;
}

export interface ComplaintFeedback {
  rating: number; // 1 to 5 stars
  comment?: string;
  created_at: string;
}

export interface Complaint {
  complaint_id: string;
  complaint_number: string; // CSP-YYYY-NNNNNN
  user_id: string;
  user_name: string;
  user_email: string;
  user_department: string;
  category: string;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  attachment: string | null; // Base64 data-URI or file info
  attachment_name: string | null;
  status: ComplaintStatus;
  assigned_to: string; // The office/department assigned
  resolution_notes?: string;
  feedback?: ComplaintFeedback;
  created_at: string;
  updated_at: string;
}

export interface ComplaintLog {
  log_id: string;
  complaint_id: string;
  action: string;
  admin_id: string;
  admin_name: string;
  remarks: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_by: string;
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}
