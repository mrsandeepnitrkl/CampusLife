/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import {
  readDatabase,
  writeDatabase,
  dbOperations,
  hashPassword
} from "./server/db.js";
import {
  User,
  UserRole,
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintLog,
  Announcement,
  FAQ
} from "./src/types.js";

const app = express();
const PORT = 3000;

// Set up larger limits for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Store active sessions and CAPTCHAs
const ACTIVE_SESSIONS = new Map<string, { userId: string; expiresAt: number }>();
const ACTIVE_CAPTCHAS = new Map<string, { question: string; answer: string; expiresAt: number }>();
const IP_LIMITS = new Map<string, { count: number; resetTime: number }>();

// Simple IP Rate Limiter
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const limit = IP_LIMITS.get(ip);

  if (!limit || now > limit.resetTime) {
    IP_LIMITS.set(ip, { count: 1, resetTime: now + 60 * 1000 }); // 1 minute window
    return next();
  }

  if (limit.count >= 100) { // Max 100 requests per minute per IP
    return res.status(429).json({ error: "Too many requests. Please try again after a minute." });
  }

  limit.count++;
  next();
}

app.use("/api", rateLimiter);

// Auth middleware
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  const session = ACTIVE_SESSIONS.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) ACTIVE_SESSIONS.delete(token); // Clean up expired
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  const users = dbOperations.getUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user || user.status === "inactive") {
    return res.status(401).json({ error: "User is suspended or does not exist." });
  }

  (req as any).user = user;
  next();
}

// Admin role check middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
  next();
}

// --- CAPTCHA ENDPOINTS ---
app.get("/api/captcha/generate", (req, res) => {
  const num1 = Math.floor(Math.random() * 9) + 1;
  const num2 = Math.floor(Math.random() * 9) + 1;
  const operations = ["+", "-"];
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let question = "";
  let answer = 0;

  if (op === "+") {
    question = `Solve: ${num1} + ${num2} = ?`;
    answer = num1 + num2;
  } else {
    question = `Solve: ${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`;
    answer = Math.max(num1, num2) - Math.min(num1, num2);
  }

  const captchaToken = crypto.randomBytes(16).toString("hex");
  ACTIVE_CAPTCHAS.set(captchaToken, {
    question,
    answer: String(answer),
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  });

  res.json({ captchaToken, question });
});

// --- AUTH ENDPOINTS ---
app.post("/api/auth/login", (req, res) => {
  const { user_id, password, captchaToken, captchaAnswer } = req.body;

  if (!user_id || !password) {
    return res.status(400).json({ error: "User ID and password are required." });
  }

  // Validate CAPTCHA
  if (!captchaToken || !captchaAnswer) {
    return res.status(400).json({ error: "Please solve the security puzzle (CAPTCHA)." });
  }

  const captcha = ACTIVE_CAPTCHAS.get(captchaToken);
  if (!captcha || Date.now() > captcha.expiresAt) {
    if (captcha) ACTIVE_CAPTCHAS.delete(captchaToken);
    return res.status(400).json({ error: "CAPTCHA expired. Please request a new one." });
  }

  if (captcha.answer !== String(captchaAnswer).trim()) {
    return res.status(400).json({ error: "Incorrect CAPTCHA answer. Please try again." });
  }

  // Clear used CAPTCHA
  ACTIVE_CAPTCHAS.delete(captchaToken);

  const users = dbOperations.getUsers();
  const hashed = hashPassword(password);
  const user = users.find(u => u.user_id.toLowerCase() === user_id.toLowerCase() && u.password_hash === hashed);

  if (!user) {
    return res.status(401).json({ error: "Invalid User ID or Password." });
  }

  if (user.status === "inactive") {
    return res.status(403).json({ error: "Your account is currently deactivated. Please contact campus support." });
  }

  // Generate Session Token
  const token = crypto.randomBytes(32).toString("hex");
  ACTIVE_SESSIONS.set(token, {
    userId: user.id,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours
  });

  const { password_hash, ...userProfile } = user;
  res.json({ token, user: userProfile });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const { password_hash, ...userProfile } = (req as any).user;
  res.json(userProfile);
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    ACTIVE_SESSIONS.delete(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

// --- FAQS & ANNOUNCEMENTS ---
app.get("/api/faqs", (req, res) => {
  res.json(dbOperations.getFAQs());
});

app.get("/api/announcements", (req, res) => {
  res.json(dbOperations.getAnnouncements());
});

// --- STUDENT PORTAL ENDPOINTS ---
app.get("/api/student/complaints", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const complaints = dbOperations.getComplaints().filter(c => c.user_id === user.user_id);
  res.json(complaints);
});

app.post("/api/student/complaints/raise", authenticate, (req, res) => {
  const user = (req as any).user as User;
  const { category, subject, description, priority, attachment, attachment_name } = req.body;

  if (!category || !subject || !description || !priority) {
    return res.status(400).json({ error: "All fields except attachment are required." });
  }

  const complaints = dbOperations.getComplaints();
  
  // Unique Complaint Number CSP-2026-NNNNNN
  const totalCount = complaints.length;
  const complaintIndex = 100100 + totalCount + 1;
  const complaint_number = `CSP-2026-${String(complaintIndex).padStart(6, "0")}`;

  const newComplaint: Complaint = {
    complaint_id: `comp-${crypto.randomBytes(8).toString("hex")}`,
    complaint_number,
    user_id: user.user_id,
    user_name: user.name,
    user_email: user.email,
    user_department: user.department,
    category,
    subject,
    description,
    priority: priority as ComplaintPriority,
    attachment: attachment || null,
    attachment_name: attachment_name || null,
    status: ComplaintStatus.SUBMITTED,
    assigned_to: category, // Default assignment to category desk
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  dbOperations.addComplaint(newComplaint);

  // Auto log creation
  const log: ComplaintLog = {
    log_id: `log-${crypto.randomBytes(8).toString("hex")}`,
    complaint_id: newComplaint.complaint_id,
    action: "Ticket Created",
    admin_id: "system",
    admin_name: "System Auto-Assigned",
    remarks: `Concern successfully registered. Assigned to '${category}' office desk for screening.`,
    timestamp: new Date().toISOString()
  };
  dbOperations.addLog(log);

  res.status(201).json(newComplaint);
});

// Tracking complaint (publicly or privately with complaint number)
app.get("/api/complaints/track/:number", (req, res) => {
  const { number } = req.params;
  const complaint = dbOperations.getComplaints().find(c => c.complaint_number.toLowerCase() === number.toLowerCase());

  if (!complaint) {
    return res.status(404).json({ error: "Complaint number not found. Check digits or formatting." });
  }

  const logs = dbOperations.getLogs().filter(l => l.complaint_id === complaint.complaint_id);
  res.json({ complaint, logs });
});

// Submit feedback for a complaint (resolved/closed)
app.post("/api/complaints/:id/feedback", (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "Rating is required and must be between 1 and 5." });
  }

  const complaint = dbOperations.getComplaints().find(c => c.complaint_id === id);
  if (!complaint) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  if (complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
    return res.status(400).json({ error: "Feedback can only be provided for Resolved or Closed complaints." });
  }

  const feedback = {
    rating: ratingNum,
    comment: comment || "",
    created_at: new Date().toISOString()
  };

  dbOperations.updateComplaint(id, { feedback });

  // Add a log entry for feedback submission
  const log: ComplaintLog = {
    log_id: `log-${crypto.randomBytes(8).toString("hex")}`,
    complaint_id: id,
    action: "Feedback Submitted",
    admin_id: "system",
    admin_name: "Feedback System",
    remarks: `User rated service: ${ratingNum}/5. Comment: ${comment || "None"}`,
    timestamp: new Date().toISOString()
  };
  dbOperations.addLog(log);

  res.json({ success: true, message: "Feedback submitted successfully.", complaint: { ...complaint, feedback } });
});

// --- ADMIN PORTAL ENDPOINTS ---
app.get("/api/admin/complaints", authenticate, requireAdmin, (req, res) => {
  const complaints = dbOperations.getComplaints();
  
  // Calculate analytics
  const total = complaints.length;
  const pending = complaints.filter(c => [ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED).length;
  const rejected = complaints.filter(c => c.status === ComplaintStatus.REJECTED).length;

  res.json({
    complaints,
    stats: { total, pending, resolved, rejected }
  });
});

app.get("/api/admin/logs", authenticate, requireAdmin, (req, res) => {
  res.json(dbOperations.getLogs());
});

app.post("/api/admin/complaints/:id/update", authenticate, requireAdmin, (req, res) => {
  const admin = (req as any).user as User;
  const { id } = req.params;
  const { status, remarks, assigned_to, resolution_notes } = req.body;

  const complaint = dbOperations.getComplaints().find(c => c.complaint_id === id);
  if (!complaint) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  const updates: Partial<Complaint> = {};
  if (status) updates.status = status as ComplaintStatus;
  if (assigned_to) updates.assigned_to = assigned_to;
  if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;

  dbOperations.updateComplaint(id, updates);

  // Log activity
  const log: ComplaintLog = {
    log_id: `log-${crypto.randomBytes(8).toString("hex")}`,
    complaint_id: id,
    action: "Status Update",
    admin_id: admin.id,
    admin_name: admin.name,
    remarks: remarks || `Status updated to '${status}' by administrative screening staff.`,
    timestamp: new Date().toISOString()
  };
  dbOperations.addLog(log);

  res.json({ success: true, message: "Complaint updated successfully" });
});

// USER MANAGEMENT ENDPOINTS
app.get("/api/admin/users", authenticate, requireAdmin, (req, res) => {
  const users = dbOperations.getUsers().map(({ password_hash, ...u }) => u);
  res.json(users);
});

app.post("/api/admin/users/create", authenticate, requireAdmin, (req, res) => {
  const { user_id, name, department, email, password, role } = req.body;

  if (!user_id || !name || !email || !password) {
    return res.status(400).json({ error: "All user fields are required." });
  }

  const users = dbOperations.getUsers();
  if (users.some(u => u.user_id.toLowerCase() === user_id.toLowerCase())) {
    return res.status(400).json({ error: "User ID already exists." });
  }

  const newUser: User = {
    id: `user-${crypto.randomBytes(8).toString("hex")}`,
    user_id,
    name,
    department: department || "Academic Block",
    email,
    password_hash: hashPassword(password),
    role: role || UserRole.STUDENT,
    status: "active",
    created_at: new Date().toISOString()
  };

  dbOperations.addUser(newUser);
  res.status(201).json({ success: true, user: { id: newUser.id, user_id: newUser.user_id, name: newUser.name } });
});

app.post("/api/admin/users/reset-password", authenticate, requireAdmin, (req, res) => {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required." });
  }

  const users = dbOperations.getUsers();
  const user = users.find(u => u.id === userId || u.user_id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  dbOperations.updateUser(user.id, { password_hash: hashPassword(newPassword) });
  res.json({ success: true, message: "Password reset successfully." });
});

app.post("/api/admin/users/toggle", authenticate, requireAdmin, (req, res) => {
  const { userId } = req.body;

  const users = dbOperations.getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (user.user_id === "admin" || user.user_id === "sandeepiitp") {
    return res.status(400).json({ error: "Cannot deactivate primary system administrator." });
  }

  const newStatus = user.status === "active" ? "inactive" : "active";
  dbOperations.updateUser(user.id, { status: newStatus });

  res.json({ success: true, status: newStatus });
});

app.post("/api/admin/users/bulk-import", authenticate, requireAdmin, (req, res) => {
  const { usersList } = req.body; // Array of { user_id, name, department, email, password, role }

  if (!Array.isArray(usersList) || usersList.length === 0) {
    return res.status(400).json({ error: "Invalid user list provided." });
  }

  const db = readDatabase();
  let importedCount = 0;
  let skippedCount = 0;

  for (const item of usersList) {
    const { user_id, name, department, email, password, role } = item;
    
    if (!user_id || !name || !email || !password) {
      skippedCount++;
      continue;
    }

    // Check if duplicate user_id
    if (db.users.some(u => u.user_id.toLowerCase() === user_id.toLowerCase())) {
      skippedCount++;
      continue;
    }

    const newUser: User = {
      id: `user-${crypto.randomBytes(8).toString("hex")}`,
      user_id,
      name,
      department: department || "Student Cell",
      email,
      password_hash: hashPassword(password),
      role: (role === "admin" ? UserRole.ADMIN : UserRole.STUDENT),
      status: "active",
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    importedCount++;
  }

  writeDatabase(db);
  res.json({ success: true, importedCount, skippedCount });
});

// BROADCASTS & FAQS MANAGING
app.post("/api/admin/announcements/broadcast", authenticate, requireAdmin, (req, res) => {
  const { title, content, category } = req.body;
  const admin = (req as any).user as User;

  if (!title || !content || !category) {
    return res.status(400).json({ error: "Title, content, and category are required." });
  }

  const newAnnouncement: Announcement = {
    id: `ann-${crypto.randomBytes(8).toString("hex")}`,
    title,
    content,
    category,
    created_by: admin.name,
    created_at: new Date().toISOString()
  };

  dbOperations.addAnnouncement(newAnnouncement);
  res.status(201).json(newAnnouncement);
});

app.delete("/api/admin/announcements/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  dbOperations.deleteAnnouncement(id);
  res.json({ success: true, message: "Announcement deleted" });
});

app.post("/api/admin/faqs/add", authenticate, requireAdmin, (req, res) => {
  const { question, answer, category } = req.body;

  if (!question || !answer || !category) {
    return res.status(400).json({ error: "Question, answer, and category are required." });
  }

  const newFAQ: FAQ = {
    id: `faq-${crypto.randomBytes(8).toString("hex")}`,
    question,
    answer,
    category
  };

  dbOperations.addFAQ(newFAQ);
  res.status(201).json(newFAQ);
});

app.delete("/api/admin/faqs/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  dbOperations.deleteFAQ(id);
  res.json({ success: true, message: "FAQ deleted" });
});


// --- INTEGRATE VITE AS MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
