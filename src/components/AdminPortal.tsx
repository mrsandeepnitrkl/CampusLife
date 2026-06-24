/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Complaint, ComplaintStatus, ComplaintPriority, ComplaintLog, Announcement, FAQ } from "../types.js";
import {
  Users,
  FileText,
  AlertOctagon,
  CheckSquare,
  Search,
  Filter,
  Trash2,
  Lock,
  PlusCircle,
  Upload,
  Calendar,
  Building,
  Activity,
  AlertCircle,
  Megaphone,
  BookOpen,
  HelpCircle,
  Eye,
  CheckCircle,
  MoreVertical,
  SlidersHorizontal,
  FolderOpen,
  Star
} from "lucide-react";

interface AdminPortalProps {
  user: User;
  token: string;
}

const CATEGORIES = [
  "Computer Centre",
  "Administration Office",
  "Academic Office",
  "CBSE Registration",
  "CBSE Marksheet Information",
  "Course Registration Portal",
  "Examination Cell",
  "Hostel Office",
  "Scholarship & Financial Aid",
  "Identity Card Issues",
  "Library Support",
  "Other Campus Services"
];

export default function AdminPortal({ user, token }: AdminPortalProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, rejected: 0 });
  const [usersList, setUsersList] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [auditLogs, setAuditLogs] = useState<ComplaintLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Active sub-section
  const [activeTab, setActiveTab] = useState<"complaints" | "users" | "announcements" | "faqs" | "analytics">("complaints");

  // Filter/Sort States for Complaints
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "priority_desc">("date_desc");

  // Selection states
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ComplaintLog[]>([]);
  const [updateStatus, setUpdateStatus] = useState<ComplaintStatus | "">("");
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateAssigned, setUpdateAssigned] = useState("");
  const [updateResolution, setUpdateResolution] = useState("");
  const [adminUpdateError, setAdminUpdateError] = useState("");
  const [adminUpdateSuccess, setAdminUpdateSuccess] = useState("");

  // Create User Form State
  const [newUserId, setNewUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("Computer Science");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("student");
  const [userFormError, setUserFormError] = useState("");
  const [userFormSuccess, setUserFormSuccess] = useState("");

  // Password reset state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  // Broadcast announcement form state
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState(CATEGORIES[0]);
  const [annError, setAnnError] = useState("");
  const [annSuccess, setAnnSuccess] = useState("");

  // Add FAQ form state
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState(CATEGORIES[0]);
  const [faqError, setFaqError] = useState("");
  const [faqSuccess, setFaqSuccess] = useState("");

  // Bulk import state
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImportError, setBulkImportError] = useState("");
  const [bulkImportSuccess, setBulkImportSuccess] = useState("");
  const [isCsvDragging, setIsCsvDragging] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch complaints & stats
      const compRes = await fetch("/api/admin/complaints", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const compData = await compRes.json();
      if (!compRes.ok) throw new Error(compData.error);
      setComplaints(compData.complaints || []);
      setStats(compData.stats || { total: 0, pending: 0, resolved: 0, rejected: 0 });

      // Fetch users
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setUsersList(usersData || []);

      // Fetch announcements
      const annRes = await fetch("/api/announcements");
      const annData = await annRes.json();
      setAnnouncements(annData || []);

      // Fetch FAQs
      const faqRes = await fetch("/api/faqs");
      const faqData = await faqRes.json();
      setFaqs(faqData || []);

      // Fetch audit logs
      const logsRes = await fetch("/api/admin/logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logsData = await logsRes.json();
      setAuditLogs(logsData || []);

    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Complaint Management Action
  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setAdminUpdateError("");
    setAdminUpdateSuccess("");

    if (!updateStatus) return setAdminUpdateError("Status update selection is required.");

    try {
      const res = await fetch(`/api/admin/complaints/${selectedComplaint.complaint_id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: updateStatus,
          remarks: updateRemarks,
          assigned_to: updateAssigned,
          resolution_notes: updateResolution
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdminUpdateSuccess("Complaint ticket updated successfully!");
      setUpdateRemarks("");
      
      // Reload tickets
      loadAllData();
      
      // Refresh current ticket view
      const updatedComp = {
        ...selectedComplaint,
        status: updateStatus as ComplaintStatus,
        assigned_to: updateAssigned || selectedComplaint.assigned_to,
        resolution_notes: updateResolution || selectedComplaint.resolution_notes
      };
      setSelectedComplaint(updatedComp);

      // Reload ticket logs
      fetch(`/api/complaints/track/${selectedComplaint.complaint_number}`)
        .then(r => r.json())
        .then(d => setSelectedLogs(d.logs || []));

    } catch (err: any) {
      setAdminUpdateError(err.message || "Failed to update complaint.");
    }
  };

  // Select complaint for inline workspace management
  const selectComplaintForManage = async (comp: Complaint) => {
    setSelectedComplaint(comp);
    setUpdateStatus(comp.status);
    setUpdateAssigned(comp.assigned_to);
    setUpdateRemarks("");
    setUpdateResolution(comp.resolution_notes || "");
    setAdminUpdateError("");
    setAdminUpdateSuccess("");

    try {
      const res = await fetch(`/api/complaints/track/${comp.complaint_number}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load logs for complaint:", err);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError("");
    setUserFormSuccess("");

    if (!newUserId || !newUserName || !newUserEmail || !newUserPassword) {
      return setUserFormError("Please enter all required fields.");
    }

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: newUserId,
          name: newUserName,
          department: newUserDept,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUserFormSuccess(`User ${newUserName} successfully registered!`);
      // Reset form
      setNewUserId("");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      
      loadAllData();
    } catch (err: any) {
      setUserFormError(err.message || "An error occurred.");
    }
  };

  // Toggle user status active/inactive
  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      loadAllData();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  // Reset password
  const handleResetPassword = async (userId: string) => {
    if (!resetPasswordVal) return alert("Enter a new password");

    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, newPassword: resetPasswordVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Password reset successfully!");
      setResettingUserId(null);
      setResetPasswordVal("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError("");
    setAnnSuccess("");

    if (!annTitle.trim() || !annContent.trim()) {
      return setAnnError("Title and content are required.");
    }

    try {
      const res = await fetch("/api/admin/announcements/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          category: annCategory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAnnSuccess("Announcement broadcasted successfully!");
      setAnnTitle("");
      setAnnContent("");
      loadAllData();
    } catch (err: any) {
      setAnnError(err.message || "Broadcast failed.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Manage FAQ
  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError("");
    setFaqSuccess("");

    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      return setFaqError("Question and Answer are required.");
    }

    try {
      const res = await fetch("/api/admin/faqs/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question: faqQuestion,
          answer: faqAnswer,
          category: faqCategory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFaqSuccess("FAQ topic successfully registered!");
      setFaqQuestion("");
      setFaqAnswer("");
      loadAllData();
    } catch (err: any) {
      setFaqError(err.message || "Failed to add FAQ.");
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm("Delete this FAQ topic?")) return;
    try {
      await fetch(`/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Drag/Drop & Parse for Bulk Uploading
  const handleCsvDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCsvDragging(true);
  };

  const handleCsvDragLeave = () => {
    setIsCsvDragging(false);
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCsvDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      parseCSV(files[0]);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      parseCSV(files[0]);
    }
  };

  const parseCSV = (file: File) => {
    setBulkImportError("");
    setBulkImportSuccess("");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const lines = text.split("\n");
        const usersToImport: any[] = [];

        // Skip header: User ID, Name, Department, Email, Password, Role
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by commas, handling potential quotes
          const cols = line.split(",").map(c => c.replace(/^["']|["']$/g, "").trim());
          if (cols.length < 5) continue;

          usersToImport.push({
            user_id: cols[0],
            name: cols[1],
            department: cols[2] || "Academic",
            email: cols[3],
            password: cols[4],
            role: cols[5] === "admin" ? "admin" : "student"
          });
        }

        if (usersToImport.length === 0) {
          throw new Error("No valid user records found in the CSV. Verify format.");
        }

        // Call bulk-import endpoint
        const response = await fetch("/api/admin/users/bulk-import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ usersList: usersToImport })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setBulkImportSuccess(`Bulk import complete! Successfully registered ${data.importedCount} users. Skipped ${data.skippedCount} duplicates/invalid rows.`);
        loadAllData();
      } catch (err: any) {
        setBulkImportError(err.message || "Failed parsing CSV. Use a comma separated format.");
      }
    };
    reader.readAsText(file);
  };

  // FILTER & SORT COMPLAINTS LIST
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    if (sortBy === "date_desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "date_asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "priority_desc") {
      const pMap = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    return 0;
  });

  // ANALYTICS DATA GENERATION
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = complaints.filter(c => c.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  const priorityCounts = {
    low: complaints.filter(c => c.priority === "low").length,
    medium: complaints.filter(c => c.priority === "medium").length,
    high: complaints.filter(c => c.priority === "high").length,
    urgent: complaints.filter(c => c.priority === "urgent").length
  };

  return (
    <div id="admin-workspace" className="w-full">
      {/* Top Cards Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Complaints</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-sans">{stats.total}</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-1.5 py-0.5 rounded font-bold">100%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Resolution</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-sans text-blue-600 dark:text-blue-400">{stats.pending}</h3>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono px-1.5 py-0.5 rounded font-bold">
              {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Tickets</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-sans text-emerald-600 dark:text-emerald-400">{stats.resolved}</h3>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono px-1.5 py-0.5 rounded font-bold">
              {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Escalated / Urgent</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold font-sans text-rose-600 dark:text-rose-400">{priorityCounts.urgent}</h3>
            <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-mono px-1.5 py-0.5 rounded font-bold">
              {stats.total > 0 ? Math.round((priorityCounts.urgent / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Admin Nav Section Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => { setActiveTab("complaints"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "complaints" && !selectedComplaint
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Manage Tickets ({complaints.length})
        </button>
        <button
          onClick={() => { setActiveTab("users"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          User Manager ({usersList.length})
        </button>
        <button
          onClick={() => { setActiveTab("announcements"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "announcements"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Announcements
        </button>
        <button
          onClick={() => { setActiveTab("faqs"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "faqs"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          FAQs Database
        </button>
        <button
          onClick={() => { setActiveTab("analytics"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "analytics"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Visual Analytics
        </button>
      </div>

      {/* 1. MANAGE TICKETS TAB (AND TIMELINE ACTION VIEWER) */}
      {activeTab === "complaints" && !selectedComplaint && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters Bento bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4.5 w-4.5" />
              <input
                type="text"
                placeholder="Search ticket, subject, student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold focus:outline-none"
              >
                <option value="All">All Statuses</option>
                {Object.values(ComplaintStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold focus:outline-none max-w-[150px] truncate"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold focus:outline-none"
              >
                <option value="All">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold focus:outline-none"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="priority_desc">Highest Priority First</option>
              </select>
            </div>
          </div>

          {/* Tickets list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {sortedComplaints.length === 0 ? (
              <div className="text-center py-20">
                <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">No ticket matches active search or filter query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-4 px-6">Ticket</th>
                      <th className="py-4 px-6">User / Dept</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {sortedComplaints.map((comp) => {
                      let statusStyle = "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                      if (comp.status === "Resolved" || comp.status === "Closed") {
                        statusStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
                      } else if (comp.status === "Rejected") {
                        statusStyle = "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                      } else if (comp.status === "In Progress" || comp.status === "Assigned") {
                        statusStyle = "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
                      }

                      let prioStyle = "text-slate-500";
                      if (comp.priority === "urgent") prioStyle = "text-rose-600 font-bold";
                      else if (comp.priority === "high") prioStyle = "text-amber-600 font-bold";

                      return (
                        <tr key={comp.complaint_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                            {comp.complaint_number}
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-900 dark:text-white">{comp.user_name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{comp.user_department}</p>
                          </td>
                          <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                            {comp.category}
                          </td>
                          <td className="py-4 px-6 text-slate-900 dark:text-white font-medium max-w-xs truncate">
                            {comp.subject}
                          </td>
                          <td className="py-4 px-6 capitalize">
                            <span className={prioStyle}>{comp.priority}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                              {comp.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => selectComplaintForManage(comp)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Activity className="h-3.5 w-3.5" /> Screening Panel
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INLINE SELECTED TICKET PANEL */}
      {selectedComplaint && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in max-w-6xl mx-auto">
          {/* Main info panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              >
                ← Back to overview list
              </button>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded">
                  {selectedComplaint.category}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {selectedComplaint.subject}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Ticket No: {selectedComplaint.complaint_number} • Raised by {selectedComplaint.user_name} ({selectedComplaint.user_email})
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Original description</h4>
                <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* User Experience Feedback Display */}
              {selectedComplaint.feedback && (
                <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 p-6 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-amber-850 dark:text-amber-400 flex items-center gap-2">
                    <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                    Student Resolution Feedback
                  </h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4.5 w-4.5 ${
                          star <= selectedComplaint.feedback!.rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                      ({selectedComplaint.feedback.rating}/5 rating)
                    </span>
                  </div>
                  {selectedComplaint.feedback.comment && (
                    <p className="text-sm text-slate-750 dark:text-slate-350 italic bg-white dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      "{selectedComplaint.feedback.comment}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono">
                    Submitted on {new Date(selectedComplaint.feedback.created_at).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedComplaint.attachment && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attachment</h4>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">{selectedComplaint.attachment_name}</span>
                    <a
                      href={selectedComplaint.attachment}
                      download={selectedComplaint.attachment_name}
                      className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}

              {/* Log timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Activity Timeline</h4>
                {selectedLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No timeline entries recorded yet.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-6 space-y-4">
                    {selectedLogs.map((log) => (
                      <div key={log.log_id} className="relative">
                        <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-blue-600"></div>
                        <p className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {log.action} <span className="font-normal text-slate-400">by {log.admin_name}</span>
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{log.remarks}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Screening workspace panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm h-fit">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              Administrative Actions
            </h3>

            <form onSubmit={handleUpdateComplaint} className="space-y-4">
              {adminUpdateSuccess && (
                <p className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium">{adminUpdateSuccess}</p>
              )}
              {adminUpdateError && (
                <p className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium">{adminUpdateError}</p>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Change Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  {Object.values(ComplaintStatus).map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Assign Office Department</label>
                <select
                  value={updateAssigned}
                  onChange={(e) => setUpdateAssigned(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Log remarks/update text</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter notes about investigation, meetings held, files checked..."
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Final Resolution Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Only fill when resolving the ticket. These notes are shown to the student."
                  value={updateResolution}
                  onChange={(e) => setUpdateResolution(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow transition-all"
              >
                Log Status Change
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. USER MANAGER TAB */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in max-w-6xl mx-auto">
          {/* List and actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Registered Users Database</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 font-semibold border-b">
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Department / Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{usr.user_id}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-950 dark:text-white">{usr.name}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                          <p>{usr.department}</p>
                          <p className="mt-0.5">{usr.email}</p>
                        </td>
                        <td className="py-3.5 px-4 capitalize font-medium">{usr.role}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              usr.status === "active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            }`}
                          >
                            {usr.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleUserStatus(usr.id)}
                            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 underline"
                          >
                            {usr.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => {
                              setResettingUserId(usr.id);
                              setResetPasswordVal("");
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            Reset Pass
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Password Reset Modal Overlay (Simulated inline) */}
            {resettingUserId && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-6 rounded-3xl animate-fade-in flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-blue-500" />
                    Reset Password for User: <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{usersList.find(u => u.id === resettingUserId)?.user_id}</span>
                  </h4>
                  <input
                    type="password"
                    placeholder="Enter new plaintext password..."
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    className="w-full px-3 py-2 mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="flex gap-2 self-end">
                  <button
                    onClick={() => setResettingUserId(null)}
                    className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResetPassword(resettingUserId)}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create User & Bulk upload forms */}
          <div className="space-y-6">
            {/* Create Single User */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                <PlusCircle className="h-4.5 w-4.5 text-blue-600" /> Create Single Record
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-3">
                {userFormSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded">{userFormSuccess}</p>}
                {userFormError && <p className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded">{userFormError}</p>}

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">User Login ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. standard student RollNo"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal student/staff name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@campuscare.edu"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Campus Department</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-xs"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics Engineering">Electronics Engineering</option>
                    <option value="Mechanical block">Mechanical block</option>
                    <option value="Physics block">Physics block</option>
                    <option value="Library Department">Library Department</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Password Plaintext *</label>
                  <input
                    type="password"
                    required
                    placeholder="Provide a strong initial password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">System Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-xs"
                  >
                    <option value="student">Student / User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl text-xs transition-all"
                >
                  Register User Record
                </button>
              </form>
            </div>

            {/* Bulk Import (CSV Drag & Drop) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Upload className="h-4.5 w-4.5 text-blue-600" /> Bulk Import (CSV)
              </h3>
              <p className="text-[10px] text-slate-400 leading-normal mb-4">
                Drag and drop a CSV file containing user records. Standard comma-separated layout column template:<br />
                <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-[9px] text-slate-600 block mt-1 select-all">
                  User ID, Name, Department, Email, Password, Role
                </code>
              </p>

              {bulkImportSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded mb-3">{bulkImportSuccess}</p>}
              {bulkImportError && <p className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded mb-3">{bulkImportError}</p>}

              <div
                onDragOver={handleCsvDragOver}
                onDragLeave={handleCsvDragLeave}
                onDrop={handleCsvDrop}
                onClick={() => csvFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isCsvDragging
                    ? "border-blue-600 bg-blue-50/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100"
                }`}
              >
                <input
                  type="file"
                  ref={csvFileInputRef}
                  onChange={handleCsvFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select CSV user file to upload
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Comma separated only</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ANNOUNCEMENTS BROADCAST TAB */}
      {activeTab === "announcements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in max-w-6xl mx-auto">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Campus Announcements</h3>
            
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No global broadcast announcements have been made yet.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono tracking-wider font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 rounded">
                          {ann.category}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-2">{ann.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          Published by {ann.created_by} • {new Date(ann.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-slate-650 dark:text-slate-350 mt-4 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
              <Megaphone className="h-4.5 w-4.5 text-blue-600" /> Broadcast Alert
            </h3>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              {annSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded">{annSuccess}</p>}
              {annError && <p className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded">{annError}</p>}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Server Maintenance"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Category</label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-xs"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Detailed Alert Content</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Provide precise details, location details, dates, alternative arrangements..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition-all"
              >
                Send Broadcaster Signal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. FAQS DATABASE TAB */}
      {activeTab === "faqs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in max-w-6xl mx-auto">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active FAQ Topics</h3>
            
            {faqs.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No FAQ topics recorded.</p>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-sm flex items-start gap-4"
                  >
                    <div className="flex-1">
                      <span className="text-[9px] tracking-wider font-mono uppercase font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-500 rounded">
                        {faq.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{faq.question}</h4>
                      <p className="text-xs text-slate-650 dark:text-slate-450 mt-1">{faq.answer}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFAQ(faq.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
              <BookOpen className="h-4.5 w-4.5 text-blue-600" /> Create FAQ Topic
            </h3>

            <form onSubmit={handleAddFAQ} className="space-y-4">
              {faqSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded">{faqSuccess}</p>}
              {faqError && <p className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded">{faqError}</p>}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Question / Query</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Where is the CBSE mark list distributed?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Category Mapping</label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-xs"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Answer Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide precise answer details, counter numbers, schedules..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition-all"
              >
                Publish FAQ Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. VISUAL ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
          {/* Custom SVG Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Category wise Ticket Distribution</h3>
              
              <div className="space-y-4">
                {CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat] || 0;
                  const percent = complaints.length > 0 ? Math.round((count / complaints.length) * 100) : 0;
                  
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="truncate max-w-[240px]">{cat}</span>
                        <span>{count} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority and Resolution Ratios */}
            <div className="space-y-8">
              {/* Priority weights */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6">Severity Load Distribution</h3>
                
                <div className="space-y-5">
                  {[
                    { label: "Urgent", count: priorityCounts.urgent, color: "bg-rose-500", text: "text-rose-600" },
                    { label: "High", count: priorityCounts.high, color: "bg-amber-500", text: "text-amber-600" },
                    { label: "Medium", count: priorityCounts.medium, color: "bg-blue-500", text: "text-blue-600" },
                    { label: "Low", count: priorityCounts.low, color: "bg-slate-500", text: "text-slate-600" }
                  ].map((prio) => {
                    const pct = complaints.length > 0 ? Math.round((prio.count / complaints.length) * 100) : 0;
                    return (
                      <div key={prio.label} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${prio.color}`}></span>
                          <span className="text-sm font-semibold text-slate-880 dark:text-slate-200">{prio.label}</span>
                        </div>
                        <div className="flex-1 max-w-[180px] h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className={`h-full ${prio.color} rounded-full`}></div>
                        </div>
                        <span className={`text-xs font-bold font-mono ${prio.text}`}>{prio.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Metrics */}
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-blue-950">
                <h3 className="text-base font-bold font-sans">Resolution Ratio Progress</h3>
                <p className="text-xs text-blue-300 mt-1">Measuring resolved complaints against total volume registered.</p>
                
                <div className="mt-8 flex items-center justify-between gap-8">
                  <div className="relative h-24 w-24 flex items-center justify-center">
                    {/* SVG Circular Progress */}
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="stroke-slate-850 fill-none"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        className="stroke-emerald-400 fill-none"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (complaints.length > 0 ? stats.resolved / complaints.length : 0))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-lg font-bold font-mono text-emerald-300">
                      {complaints.length > 0 ? Math.round((stats.resolved / complaints.length) * 100) : 0}%
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 text-sm text-blue-250">
                    <p className="flex justify-between">
                      <span>Total Handled:</span>
                      <strong className="text-white font-mono">{complaints.length}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Successfully Resolved:</span>
                      <strong className="text-emerald-300 font-mono">{stats.resolved}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Outstanding Backlog:</span>
                      <strong className="text-amber-300 font-mono">{stats.pending}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Experience Feedback Analytics */}
          <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              User Satisfaction & Experience Analytics
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Avg Rating Card */}
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Average Satisfaction Rating</p>
                <h4 className="text-5xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {complaints.filter(c => c.feedback).length > 0
                    ? (complaints.filter(c => c.feedback).reduce((sum, c) => sum + c.feedback!.rating, 0) / complaints.filter(c => c.feedback).length).toFixed(1)
                    : "N/A"}
                </h4>
                <div className="flex items-center gap-1 mt-3">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = complaints.filter(c => c.feedback).length > 0
                      ? (complaints.filter(c => c.feedback).reduce((sum, c) => sum + c.feedback!.rating, 0) / complaints.filter(c => c.feedback).length)
                      : 0;
                    return (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(avg)
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Based on {complaints.filter(c => c.feedback).length} submitted feedback reviews
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rating distribution</p>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const totalFb = complaints.filter(c => c.feedback).length;
                  const count = complaints.filter(c => c.feedback && c.feedback.rating === rating).length;
                  const pct = totalFb > 0 ? Math.round((count / totalFb) * 100) : 0;
                  return (
                    <div key={rating} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold flex items-center gap-1 font-mono w-6">
                        {rating} <Star className="h-3 w-3 text-amber-500 fill-amber-500 inline" />
                      </span>
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="font-semibold font-mono text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>

              {/* General Feedback stats summary */}
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Feedback summary</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Student feedback is gathered as soon as a complaint ticket is marked as resolved or closed. 
                    This helps identify performance patterns of campus offices and computer centres.
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Feedback Submission Rate:</span>
                    <span className="font-bold font-mono">
                      {stats.resolved > 0
                        ? `${Math.round((complaints.filter(c => c.feedback).length / stats.resolved) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Positive reviews (4-5★):</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {complaints.filter(c => c.feedback).length > 0
                        ? `${Math.round((complaints.filter(c => c.feedback && c.feedback.rating >= 4).length / complaints.filter(c => c.feedback).length) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable feed of reviews */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Student Reviews & Comments</h4>
              {complaints.filter(c => c.feedback).length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border text-center">
                  No comments or feedback have been submitted yet.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {complaints
                    .filter(c => c.feedback)
                    .map((c) => (
                      <div key={c.complaint_id} className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{c.user_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({c.user_department})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Ticket {c.complaint_number}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= c.feedback!.rating
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-slate-300 dark:text-slate-700"
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-semibold text-slate-500 ml-1">
                            {new Date(c.feedback!.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {c.feedback!.comment && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                            "{c.feedback!.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
