/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, Complaint, ComplaintLog, Announcement, FAQ, UserRole, ComplaintPriority, ComplaintStatus } from "../src/types.js";

const DB_FILE = path.join(process.cwd(), "database.json");

interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
  logs: ComplaintLog[];
  announcements: Announcement[];
  faqs: FAQ[];
}

export function hashPassword(password: string): string {
  const salt = "campuscare_secure_salt";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

function getInitialDatabase(): DatabaseSchema {
  const defaultAdmin: User = {
    id: "user-admin",
    user_id: "sandeepiitp",
    name: "CampusCare Administrator",
    email: "admin@campuscare.edu",
    department: "Administration Office",
    password_hash: hashPassword("iit@2025A"),
    role: UserRole.ADMIN,
    status: "active",
    created_at: new Date("2026-01-01T00:00:00Z").toISOString()
  };

  const defaultStudent1: User = {
    id: "user-student-1",
    user_id: "student123",
    name: "Rahul Sharma",
    email: "rahul.sharma@campus.edu",
    department: "Computer Science",
    password_hash: hashPassword("student123"),
    role: UserRole.STUDENT,
    status: "active",
    created_at: new Date("2026-01-02T00:00:00Z").toISOString()
  };

  const defaultStudent2: User = {
    id: "user-student-2",
    user_id: "student456",
    name: "Priya Patel",
    email: "priya.patel@campus.edu",
    department: "Electronics Engineering",
    password_hash: hashPassword("student456"),
    role: UserRole.STUDENT,
    status: "active",
    created_at: new Date("2026-01-03T00:00:00Z").toISOString()
  };

  const defaultComplaints: Complaint[] = [
    {
      complaint_id: "comp-1",
      complaint_number: "CSP-2026-000101",
      user_id: "student123",
      user_name: "Rahul Sharma",
      user_email: "rahul.sharma@campus.edu",
      user_department: "Computer Science",
      category: "Computer Centre",
      subject: "Wi-Fi login issues in Hostel H3",
      description: "The Wi-Fi in Hostel H3 Floor 2 is constantly disconnecting. Whenever it connects, it redirects to the login page but says 'invalid session token'. Please assist as examinations are approaching.",
      priority: ComplaintPriority.HIGH,
      attachment: null,
      attachment_name: null,
      status: ComplaintStatus.ASSIGNED,
      assigned_to: "Computer Centre",
      created_at: new Date("2026-06-20T10:30:00Z").toISOString(),
      updated_at: new Date("2026-06-21T14:15:00Z").toISOString()
    },
    {
      complaint_id: "comp-2",
      complaint_number: "CSP-2026-000102",
      user_id: "student456",
      user_name: "Priya Patel",
      user_email: "priya.patel@campus.edu",
      user_department: "Electronics Engineering",
      category: "Scholarship & Financial Aid",
      subject: "Disbursement delay of Merit Scholarship",
      description: "My merit scholarship for the Spring 2026 semester has been approved, but the disbursement is still pending in my registered bank account. The reference letter was submitted to Counter 5.",
      priority: ComplaintPriority.MEDIUM,
      attachment: null,
      attachment_name: null,
      status: ComplaintStatus.RESOLVED,
      assigned_to: "Administration Office",
      resolution_notes: "The disbursement has been verified and processed by the Finance Section. The amount of $1,500 should reflect in your registered bank account within 2-3 business days. Reference Transaction ID: CC-TXN-99812.",
      created_at: new Date("2026-06-18T09:00:00Z").toISOString(),
      updated_at: new Date("2026-06-22T11:30:00Z").toISOString()
    },
    {
      complaint_id: "comp-3",
      complaint_number: "CSP-2026-000103",
      user_id: "student123",
      user_name: "Rahul Sharma",
      user_email: "rahul.sharma@campus.edu",
      user_department: "Computer Science",
      category: "Academic Office",
      subject: "Course registration portal prerequisite error",
      description: "I am trying to register for Advanced Machine Learning (CS-402), but the portal keeps showing a prerequisite error for CS-301. However, I have already completed CS-301 in the last semester with an A grade. Screenshot attached.",
      priority: ComplaintPriority.LOW,
      attachment: null,
      attachment_name: null,
      status: ComplaintStatus.UNDER_REVIEW,
      assigned_to: "Academic Office",
      created_at: new Date("2026-06-24T08:00:00Z").toISOString(),
      updated_at: new Date("2026-06-24T08:00:00Z").toISOString()
    }
  ];

  const defaultLogs: ComplaintLog[] = [
    {
      log_id: "log-1",
      complaint_id: "comp-1",
      action: "Status Update",
      admin_id: "user-admin",
      admin_name: "CampusCare Administrator",
      remarks: "Complaint received and assigned directly to Computer Centre systems administrator for checking.",
      timestamp: new Date("2026-06-21T14:15:00Z").toISOString()
    },
    {
      log_id: "log-2",
      complaint_id: "comp-2",
      action: "Status Update",
      admin_id: "user-admin",
      admin_name: "CampusCare Administrator",
      remarks: "Checked scholarship disbursement status with Finance and resolved the concern.",
      timestamp: new Date("2026-06-22T11:30:00Z").toISOString()
    }
  ];

  const defaultAnnouncements: Announcement[] = [
    {
      id: "ann-1",
      title: "Course Registration Portal Open for Fall 2026",
      content: "Course registration for the upcoming Fall 2026 semester will officially open on July 1st, 2026. All students are advised to clear any outstanding library dues, hostel fees, or administrative penalties prior to this date. Holds will not be bypassed.",
      category: "Course Registration Portal",
      created_by: "Academic Office",
      created_at: new Date("2026-06-24T09:00:00Z").toISOString()
    },
    {
      id: "ann-2",
      title: "CBSE Marksheet Cumulative Verification Service",
      content: "CBSE Registration & Marksheet verification counters will be active from June 25th to July 10th at the Administrative Block Counter 4. Students must bring original passing certificates and two photocopies.",
      category: "CBSE Marksheet Information",
      created_by: "Administration Office",
      created_at: new Date("2026-06-23T11:00:00Z").toISOString()
    },
    {
      id: "ann-3",
      title: "Maintenance Shutdown: Campus Wi-Fi Switch Upgrades",
      content: "The Computer Centre will be performing critical core switch upgrades on Sunday, June 28th, between 10:00 PM and 2:00 AM. Total internet blackout is expected across hostel premises during this duration. We apologize for the inconvenience.",
      category: "Computer Centre",
      created_by: "Computer Centre",
      created_at: new Date("2026-06-22T14:00:00Z").toISOString()
    }
  ];

  const defaultFAQs: FAQ[] = [
    {
      id: "faq-1",
      question: "How long does it typically take to resolve a complaint?",
      answer: "Low priority complaints are resolved within 5-7 working days. Medium priority concerns are addressed within 3-5 days. High and Urgent complaints are immediately triaged and generally resolved within 24-48 hours.",
      category: "Other Campus Services"
    },
    {
      id: "faq-2",
      question: "How do I download my official grade sheet?",
      answer: "You can download your unofficial grade sheet via the Course Registration Portal. For official, stamped marksheet verifications, submit an inquiry under 'CBSE Marksheet Information' or visit Administrative Counter 2.",
      category: "CBSE Marksheet Information"
    },
    {
      id: "faq-3",
      question: "My Identity Card is damaged, how can I request a replacement?",
      answer: "Raise a concern under 'Identity Card Issues' in this portal, uploading a copy of your current card and passport photo. Pay the $5 replacement fee at the Finance Desk, and collect your card from the Admin Office in 2 days.",
      category: "Identity Card Issues"
    },
    {
      id: "faq-4",
      question: "Can I request a hostel room change mid-semester?",
      answer: "Normally, room change allocations are only processed in the first two weeks of each semester. Under exceptional medical circumstances, please register a complaint under 'Hostel Office' with supporting medical evidence.",
      category: "Hostel Office"
    }
  ];

  return {
    users: [defaultAdmin, defaultStudent1, defaultStudent2],
    complaints: defaultComplaints,
    logs: defaultLogs,
    announcements: defaultAnnouncements,
    faqs: defaultFAQs
  };
}

export function readDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(data) as DatabaseSchema;
    
    // Self-healing migration for admin credentials
    let hasSandeep = db.users.some((u: any) => u.user_id.toLowerCase() === "sandeepiitp");
    if (!hasSandeep) {
      const oldAdminIndex = db.users.findIndex((u: any) => u.user_id === "admin" && u.role === UserRole.ADMIN);
      if (oldAdminIndex !== -1) {
        db.users[oldAdminIndex].user_id = "sandeepiitp";
        db.users[oldAdminIndex].password_hash = hashPassword("iit@2025A");
      } else {
        db.users.push({
          id: "user-admin",
          user_id: "sandeepiitp",
          name: "CampusCare Administrator",
          email: "admin@campuscare.edu",
          department: "Administration Office",
          password_hash: hashPassword("iit@2025A"),
          role: UserRole.ADMIN,
          status: "active",
          created_at: new Date("2026-01-01T00:00:00Z").toISOString()
        });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    }
    return db;
  } catch (error) {
    console.error("Error reading database file, returning defaults:", error);
    return getInitialDatabase();
  }
}

export function writeDatabase(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Helper methods to make transactions cleaner
export const dbOperations = {
  getUsers: () => readDatabase().users,
  addUser: (user: User) => {
    const db = readDatabase();
    db.users.push(user);
    writeDatabase(db);
  },
  updateUser: (userId: string, updatedFields: Partial<User>) => {
    const db = readDatabase();
    db.users = db.users.map(u => u.id === userId || u.user_id === userId ? { ...u, ...updatedFields } as User : u);
    writeDatabase(db);
  },
  getComplaints: () => readDatabase().complaints,
  addComplaint: (complaint: Complaint) => {
    const db = readDatabase();
    db.complaints.push(complaint);
    writeDatabase(db);
  },
  updateComplaint: (complaintId: string, updatedFields: Partial<Complaint>) => {
    const db = readDatabase();
    db.complaints = db.complaints.map(c => c.complaint_id === complaintId ? { ...c, ...updatedFields, updated_at: new Date().toISOString() } as Complaint : c);
    writeDatabase(db);
  },
  getLogs: () => readDatabase().logs,
  addLog: (log: ComplaintLog) => {
    const db = readDatabase();
    db.logs.push(log);
    writeDatabase(db);
  },
  getAnnouncements: () => readDatabase().announcements,
  addAnnouncement: (announcement: Announcement) => {
    const db = readDatabase();
    db.announcements.unshift(announcement); // Newest announcements first
    writeDatabase(db);
  },
  deleteAnnouncement: (id: string) => {
    const db = readDatabase();
    db.announcements = db.announcements.filter(a => a.id !== id);
    writeDatabase(db);
  },
  getFAQs: () => readDatabase().faqs,
  addFAQ: (faq: FAQ) => {
    const db = readDatabase();
    db.faqs.push(faq);
    writeDatabase(db);
  },
  deleteFAQ: (id: string) => {
    const db = readDatabase();
    db.faqs = db.faqs.filter(f => f.id !== id);
    writeDatabase(db);
  }
};
