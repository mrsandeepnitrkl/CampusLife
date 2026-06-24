import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // We can use uuid or custom string id (e.g. user-admin, user-student-1, or Firebase Auth UID)
  userId: text("user_id").notNull().unique(), // The login ID
  name: text("name").notNull(),
  email: text("email").notNull(),
  department: text("department").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // "student" | "admin"
  status: text("status").notNull(), // "active" | "inactive"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 2. Complaints Table
export const complaints = pgTable("complaints", {
  complaintId: text("complaint_id").primaryKey(),
  complaintNumber: text("complaint_number").notNull().unique(), // CSP-YYYY-NNNNNN
  userId: text("user_id").notNull(), // Links to users.userId
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  userDepartment: text("user_department").notNull(),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(), // "low" | "medium" | "high" | "urgent"
  attachment: text("attachment"), // Base64 data-URI or file info
  attachmentName: text("attachment_name"),
  status: text("status").notNull(), // "Submitted" | "Under Review" | "Assigned" | "In Progress" | "Resolved" | "Closed" | "Rejected"
  assignedTo: text("assigned_to").notNull(), // The office/department assigned
  resolutionNotes: text("resolution_notes"),
  feedback: jsonb("feedback"), // Stores { rating: number, comment?: string, created_at: string }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 3. Complaint Logs Table
export const complaintLogs = pgTable("complaint_logs", {
  logId: text("log_id").primaryKey(),
  complaintId: text("complaint_id")
    .notNull()
    .references(() => complaints.complaintId, { onDelete: "cascade" }),
  action: text("action").notNull(),
  adminId: text("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  remarks: text("remarks").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// 4. Announcements Table
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 5. FAQs Table
export const faqs = pgTable("faqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
});

// Relations
export const complaintsRelations = relations(complaints, ({ many }) => ({
  logs: many(complaintLogs),
}));

export const complaintLogsRelations = relations(complaintLogs, ({ one }) => ({
  complaint: one(complaints, {
    fields: [complaintLogs.complaintId],
    references: [complaints.complaintId],
  }),
}));
