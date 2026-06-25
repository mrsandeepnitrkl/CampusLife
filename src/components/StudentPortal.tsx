/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Complaint, ComplaintPriority, ComplaintStatus, ComplaintLog } from "../types.js";
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  Search,
  ArrowRight,
  Eye,
  X,
  FileDown,
  ChevronRight,
  UserCheck,
  Building,
  Sparkles,
  Star
} from "lucide-react";

interface StudentPortalProps {
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

export default function StudentPortal({ user, token }: StudentPortalProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "raise" | "track">("dashboard");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintLogs, setComplaintLogs] = useState<ComplaintLog[]>([]);

  // Search/Track State
  const [trackNumberInput, setTrackNumberInput] = useState("");
  const [trackedTicket, setTrackedTicket] = useState<Complaint | null>(null);
  const [trackedLogs, setTrackedLogs] = useState<ComplaintLog[]>([]);
  const [trackError, setTrackError] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);

  // Form States
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ComplaintPriority>(ComplaintPriority.MEDIUM);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Feedback System States
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackError, setFeedbackError] = useState<string>("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  useEffect(() => {
    setFeedbackRating(0);
    setHoverRating(0);
    setFeedbackComment("");
    setFeedbackError("");
    setFeedbackSuccess("");
  }, [selectedComplaint, trackedTicket, activeTab]);

  const handleFeedbackSubmit = async (complaintId: string) => {
    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError("Please select a rating from 1 to 5 stars.");
      return;
    }
    setSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackSuccess("");

    try {
      const res = await fetch(`/api/complaints/${complaintId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setFeedbackSuccess("Thank you! Your feedback has been received.");
      setFeedbackRating(0);
      setFeedbackComment("");

      // Update local complaints list
      setComplaints((prev) =>
        prev.map((c) => (c.complaint_id === complaintId ? data.complaint : c))
      );

      // Update selected complaint if active
      if (selectedComplaint && selectedComplaint.complaint_id === complaintId) {
        setSelectedComplaint(data.complaint);
      }

      // Update tracked ticket if active
      if (trackedTicket && trackedTicket.complaint_id === complaintId) {
        setTrackedTicket(data.complaint);
      }

      // Refresh logs
      handleFetchTicketLogs(complaintId);
    } catch (err: any) {
      setFeedbackError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = () => {
    setLoading(true);
    fetch("/api/student/complaints", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setComplaints(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching student complaints:", err);
        setLoading(false);
      });
  };

  const handleFetchTicketLogs = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/track/${complaints.find(c => c.complaint_id === complaintId)?.complaint_number || ""}`);
      const data = await res.json();
      if (!data.error) {
        setComplaintLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setSubmitError("Invalid file type. Please upload a PDF, PNG, or JPG document.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    setSubmitError("");
    setAttachmentName(file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(reader.result as string);
    };
    reader.onerror = () => {
      setSubmitError("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Complaint
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(null);

    if (!subject.trim()) return setSubmitError("Subject is required.");
    if (!description.trim()) return setSubmitError("Detailed description is required.");

    setSubmitting(true);

    try {
      const res = await fetch("/api/student/complaints/raise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          subject,
          description,
          priority,
          attachment,
          attachment_name: attachmentName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit concern.");
      }

      setSubmitSuccess(`Concern registered successfully! Complaint Number generated: ${data.complaint_number}`);
      // Clear form
      setSubject("");
      setDescription("");
      setAttachment(null);
      setAttachmentName(null);
      
      // Reload lists
      fetchComplaints();
      
      // Auto focus track with new number
      setTrackNumberInput(data.complaint_number);
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Track Ticket By Number
  const handleTrackTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTrackError("");
    setTrackedTicket(null);
    setTrackedLogs([]);

    if (!trackNumberInput.trim()) {
      return setTrackError("Please enter a valid complaint number.");
    }

    setTrackLoading(true);

    try {
      const res = await fetch(`/api/complaints/track/${trackNumberInput.trim()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to search ticket.");
      }

      setTrackedTicket(data.complaint);
      setTrackedLogs(data.logs || []);
    } catch (err: any) {
      setTrackError(err.message || "No complaint matched that number. Check characters and dashes.");
    } finally {
      setTrackLoading(false);
    }
  };

  // Print receipt function
  const handlePrintReceipt = (ticket: Complaint) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Complaint Receipt - ${ticket.complaint_number}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 5px; }
            .title { font-size: 18px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .ticket-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
            .row { display: flex; margin-bottom: 12px; }
            .label { font-weight: bold; width: 180px; color: #475569; }
            .value { flex: 1; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #e0e7ff; color: #4338ca; }
            .footer { border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CampusCare Support Portal</div>
            <div class="title">Official Complaint Receipt</div>
          </div>
          <div class="ticket-box">
            <div class="row"><div class="label">Complaint Number:</div><div class="value"><strong>${ticket.complaint_number}</strong></div></div>
            <div class="row"><div class="label">Student Name:</div><div class="value">${ticket.user_name}</div></div>
            <div class="row"><div class="label">Student Email:</div><div class="value">${ticket.user_email}</div></div>
            <div class="row"><div class="label">Department:</div><div class="value">${ticket.user_department}</div></div>
            <div class="row"><div class="label">Complaint Category:</div><div class="value">${ticket.category}</div></div>
            <div class="row"><div class="label">Subject:</div><div class="value">${ticket.subject}</div></div>
            <div class="row"><div class="label">Priority Level:</div><div class="value" style="text-transform: capitalize;">${ticket.priority}</div></div>
            <div class="row"><div class="label">Current Status:</div><div class="value"><span class="status-badge">${ticket.status}</span></div></div>
            <div class="row"><div class="label">Assigned Office:</div><div class="value">${ticket.assigned_to}</div></div>
            <div class="row"><div class="label">Date Raised:</div><div class="value">${new Date(ticket.created_at).toLocaleString()}</div></div>
          </div>
          <div style="margin-bottom: 24px;">
            <h3>Complaint Description:</h3>
            <p style="white-space: pre-wrap; background: #fff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">${ticket.description}</p>
          </div>
          ${ticket.resolution_notes ? `
          <div style="margin-bottom: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
            <h3 style="color: #15803d; margin-top: 0;">Resolution Notes:</h3>
            <p style="white-space: pre-wrap; margin: 0;">${ticket.resolution_notes}</p>
          </div>
          ` : ""}
          <div class="footer">
            Generated automatically via CampusCare Support System. Managed by FIC Emergency block.<br/>
            Timestamp: ${new Date().toLocaleString()}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export JSON Ticket
  const handleExportJSON = (ticket: Complaint) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ticket, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${ticket.complaint_number}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Stats Counters
  const submittedCount = complaints.length;
  const inProgressCount = complaints.filter(c => [ComplaintStatus.UNDER_REVIEW, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS].includes(c.status)).length;
  const resolvedCount = complaints.filter(c => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED).length;

  return (
    <div id="student-portal-root" className="w-full">
      {/* Mini Profile Board */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-lg border border-blue-950">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="h-40 w-40 text-blue-300" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Student Workspace
            </span>
            <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight mt-3">
              Welcome back, <span className="text-blue-200">{user.name}</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 font-mono">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                ID: {user.user_id}
              </span>
              <span className="text-slate-500">•</span>
              <span className="flex items-center gap-1 font-sans">
                <Building className="h-4 w-4 text-blue-400" />
                {user.department}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setActiveTab("raise"); setSelectedComplaint(null); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              New Concern
            </button>
            <button
              onClick={() => { setActiveTab("track"); setSelectedComplaint(null); }}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Track Number
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => { setActiveTab("dashboard"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "dashboard" && !selectedComplaint
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          My Dashboard
        </button>
        <button
          onClick={() => { setActiveTab("raise"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "raise"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Raise Concern
        </button>
        <button
          onClick={() => { setActiveTab("track"); setSelectedComplaint(null); }}
          className={`pb-4 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "track" || selectedComplaint
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          Track & History
        </button>
      </div>

      {/* 1. DASHBOARD TAB */}
      {activeTab === "dashboard" && !selectedComplaint && (
        <div className="space-y-8 animate-fade-in">
          {/* Statistics Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Registered</p>
                <h3 className="text-2xl font-bold font-sans mt-0.5">{submittedCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Resolution</p>
                <h3 className="text-2xl font-bold font-sans mt-0.5">{inProgressCount}</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Resolved & Closed</p>
                <h3 className="text-2xl font-bold font-sans mt-0.5">{resolvedCount}</h3>
              </div>
            </div>
          </div>

          {/* Recent Complaints Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold font-sans text-slate-900 dark:text-white">Recent Service Concerns</h2>
              <button
                onClick={() => setActiveTab("track")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View Complete History
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-16 px-6">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No complaints raised yet</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                  If you have issues with Course registration, CBSE records, library, or Wi-Fi, submit a new ticket.
                </p>
                <button
                  onClick={() => setActiveTab("raise")}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
                >
                  <PlusCircle className="h-4 w-4" /> Raise Your First Concern
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-4 px-6">Complaint No.</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Subject</th>
                      <th className="py-4 px-6">Priority</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {complaints.slice(0, 5).map((comp) => {
                      let statusStyle = "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
                      if (comp.status === "Resolved" || comp.status === "Closed") {
                        statusStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
                      } else if (comp.status === "Rejected") {
                        statusStyle = "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                      } else if (comp.status === "In Progress" || comp.status === "Assigned") {
                        statusStyle = "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
                      }

                      let prioStyle = "text-slate-500";
                      if (comp.priority === ComplaintPriority.URGENT) prioStyle = "text-rose-600 font-semibold";
                      else if (comp.priority === ComplaintPriority.HIGH) prioStyle = "text-amber-600 font-semibold";

                      return (
                        <tr key={comp.complaint_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                            {comp.complaint_number}
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
                              onClick={() => {
                                setSelectedComplaint(comp);
                                handleFetchTicketLogs(comp.complaint_id);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Timeline
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

      {/* 2. RAISE CONCERN TAB */}
      {activeTab === "raise" && (
        <div className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm animate-fade-in mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-sans text-slate-900 dark:text-white">Register a New Service Concern</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Submit details of your query. A unique tracking ticket and number will be generated immediately.
            </p>
          </div>

          <form onSubmit={handleSubmitComplaint} className="space-y-6">
            {submitSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium leading-relaxed">
                {submitSuccess}
              </div>
            )}

            {submitError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                {submitError}
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Complaint Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Subject line *
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of the issue..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Detailed description *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your issue with exact details, block numbers, grade details, dates, or error messages encountered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed"
              ></textarea>
            </div>

            {/* Priority Level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Priority Level *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: ComplaintPriority.LOW, label: "Low", bg: "hover:bg-slate-50" },
                  { value: ComplaintPriority.MEDIUM, label: "Medium", bg: "hover:bg-slate-50" },
                  { value: ComplaintPriority.HIGH, label: "High", bg: "hover:bg-amber-50" },
                  { value: ComplaintPriority.URGENT, label: "Urgent", bg: "hover:bg-rose-50" }
                ].map((prio) => (
                  <label
                    key={prio.value}
                    className={`border rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${prio.bg} ${
                      priority === prio.value
                        ? "border-blue-600 bg-blue-50/40 text-blue-700 font-semibold ring-2 ring-blue-500/10"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={prio.value}
                      checked={priority === prio.value}
                      onChange={() => setPriority(prio.value)}
                      className="sr-only"
                    />
                    <span className="text-sm capitalize">{prio.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Upload Attachment (Drag and Drop) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Supporting Documents (PDF / JPG / PNG - Max 5MB)
              </label>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-600 bg-blue-50/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />
                
                {attachment ? (
                  <div className="flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-white max-w-xs truncate">
                      {attachmentName}
                    </p>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-rose-600 hover:underline font-semibold"
                    >
                      <X className="h-3.5 w-3.5" /> Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Drag & Drop supporting documents, or <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline">browse files</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Only PDFs and Images up to 5MB are accepted.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-slate-150 dark:border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting concern...
                  </>
                ) : (
                  <>
                    Submit Support Ticket
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. TRACK & HISTORY TAB */}
      {activeTab === "track" && !selectedComplaint && (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
          {/* Tracking Search Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold font-sans text-slate-900 dark:text-white">Track Ticket Status</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Enter your unique CSP ticket number to view its assigned handler, current resolution state, and logs.
              </p>
            </div>

            <form onSubmit={handleTrackTicket} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  placeholder="Example: CSP-2026-000101"
                  value={trackNumberInput}
                  onChange={(e) => setTrackNumberInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-mono font-bold tracking-wider uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={trackLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {trackLoading ? "Searching..." : "Track Progress"}
              </button>
            </form>

            {trackError && (
              <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950 border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                {trackError}
              </div>
            )}
          </div>

          {/* Tracked ticket display */}
          {trackedTicket && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                  <span className="text-[10px] tracking-wider font-mono font-bold uppercase px-2.5 py-1 bg-slate-100 dark:bg-slate-850 text-slate-500 rounded-full">
                    {trackedTicket.category}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                    {trackedTicket.subject}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Ticket No: {trackedTicket.complaint_number} • Submitted on {new Date(trackedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePrintReceipt(trackedTicket)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
                  >
                    <FileDown className="h-3.5 w-3.5 text-blue-500" /> Receipt
                  </button>
                  <button
                    onClick={() => handleExportJSON(trackedTicket)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              {/* Status and Handlers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Current Status</p>
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {trackedTicket.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Assigned Desk</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2 flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-slate-400" />
                    {trackedTicket.assigned_to}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-bold text-slate-400">Priority Level</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2 capitalize">
                    {trackedTicket.priority}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Concern Description</h4>
                <div className="bg-slate-50/50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {trackedTicket.description}
                </div>
              </div>

              {/* Resolution Notes (if resolved) */}
              {trackedTicket.resolution_notes && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-6 rounded-2xl">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                    Resolution Summary
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {trackedTicket.resolution_notes}
                  </p>
                </div>
              )}

              {/* Service Feedback Section */}
              {(trackedTicket.status === ComplaintStatus.RESOLVED || trackedTicket.status === ComplaintStatus.CLOSED) && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-6 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <Star className="h-4.5 w-4.5 text-blue-500 fill-current" />
                    Service Experience Feedback
                  </h4>
                  
                  {trackedTicket.feedback ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= trackedTicket.feedback!.rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-slate-300 dark:text-slate-700"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-2">
                          ({trackedTicket.feedback.rating}/5 Rating)
                        </span>
                      </div>
                      {trackedTicket.feedback.comment && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          "{trackedTicket.feedback.comment}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Feedback submitted on {new Date(trackedTicket.feedback.created_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        How satisfied were you with the resolution of this concern? Your feedback helps us improve campus services.
                      </p>
                      
                      {feedbackSuccess && (
                        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded">{feedbackSuccess}</p>
                      )}
                      {feedbackError && (
                        <p className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded">{feedbackError}</p>
                      )}

                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setFeedbackRating(star)}
                            className="focus:outline-none transition-transform active:scale-110"
                          >
                            <Star
                              className={`h-7 w-7 transition-colors ${
                                star <= (hoverRating || feedbackRating)
                                  ? "text-amber-500 fill-amber-500"
                                  : "text-slate-300 dark:text-slate-700 hover:text-amber-400"
                              }`}
                            />
                          </button>
                        ))}
                        {feedbackRating > 0 && (
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                            {["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"][feedbackRating - 1]}
                          </span>
                        )}
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          placeholder="Tell us what went well or how we can improve (optional)..."
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                        ></textarea>
                      </div>

                      <button
                        type="button"
                        disabled={feedbackRating === 0 || submittingFeedback}
                        onClick={() => handleFeedbackSubmit(trackedTicket.complaint_id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                      >
                        {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Logs / Timeline */}
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Activity Audit Log</h4>
                {trackedLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No updates have been logged on this ticket yet.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-6 space-y-6">
                    {trackedLogs.map((log) => (
                      <div key={log.log_id} className="relative">
                        {/* Bullet indicator */}
                        <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600"></div>
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {log.action} <span className="text-xs font-normal text-slate-400">• Updated by {log.admin_name}</span>
                          </h5>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {log.remarks}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ticket List fallback for reference */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Complete Ticket History</h3>
            
            {complaints.length === 0 ? (
              <p className="text-sm text-slate-500">No tickets logged.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => (
                  <div
                    key={c.complaint_id}
                    onClick={() => {
                      setTrackNumberInput(c.complaint_number);
                      setSelectedComplaint(null);
                      // Force search
                      fetch(`/api/complaints/track/${c.complaint_number}`)
                        .then(res => res.json())
                        .then(data => {
                          setTrackedTicket(data.complaint);
                          setTrackedLogs(data.logs || []);
                        });
                    }}
                    className="p-4 border border-slate-150 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-4 bg-slate-50/20"
                  >
                    <div>
                      <p className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        {c.complaint_number}
                      </p>
                      <h4 className="text-sm font-semibold text-slate-850 dark:text-white mt-1 max-w-md truncate">
                        {c.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {c.category} • Submitted on {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {c.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTIVE SELECTED COMPLAINT TIMELINE VIEWER */}
      {selectedComplaint && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm animate-fade-in max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1"
            >
              ← Back to workspace
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintReceipt(selectedComplaint)}
                className="text-xs font-semibold px-2.5 py-1.5 border rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Print Ticket Receipt
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[10px] tracking-wider font-mono font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 rounded">
                {selectedComplaint.category}
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                {selectedComplaint.subject}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Ticket No: {selectedComplaint.complaint_number} • Created {new Date(selectedComplaint.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {selectedComplaint.status}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Original Concern</h4>
            <p className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {selectedComplaint.description}
            </p>
          </div>

          {selectedComplaint.resolution_notes && (
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
              <h4 className="text-sm font-bold text-emerald-800 mb-1">Resolution Summary</h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.resolution_notes}
              </p>
            </div>
          )}

          {/* Service Feedback Section */}
          {(selectedComplaint.status === ComplaintStatus.RESOLVED || selectedComplaint.status === ComplaintStatus.CLOSED) && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-6 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Star className="h-4.5 w-4.5 text-blue-500 fill-current" />
                Service Experience Feedback
              </h4>
              
              {selectedComplaint.feedback ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= selectedComplaint.feedback!.rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-2">
                      ({selectedComplaint.feedback.rating}/5 Rating)
                    </span>
                  </div>
                  {selectedComplaint.feedback.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{selectedComplaint.feedback.comment}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Feedback submitted on {new Date(selectedComplaint.feedback.created_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    How satisfied were you with the resolution of this concern? Your feedback helps us improve campus services.
                  </p>
                  
                  {feedbackSuccess && (
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded">{feedbackSuccess}</p>
                  )}
                  {feedbackError && (
                    <p className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded">{feedbackError}</p>
                  )}

                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFeedbackRating(star)}
                        className="focus:outline-none transition-transform active:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoverRating || feedbackRating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-400"
                          }`}
                        />
                      </button>
                    ))}
                    {feedbackRating > 0 && (
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                        {["Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"][feedbackRating - 1]}
                      </span>
                    )}
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      placeholder="Tell us what went well or how we can improve (optional)..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                    ></textarea>
                  </div>

                  <button
                    type="button"
                    disabled={feedbackRating === 0 || submittingFeedback}
                    onClick={() => handleFeedbackSubmit(selectedComplaint.complaint_id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                  >
                    {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Detailed Timeline logs</h4>
            <div className="relative border-l-2 border-slate-100 ml-2 pl-6 space-y-6">
              {complaintLogs.map((log) => (
                <div key={log.log_id} className="relative">
                  <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600"></div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    <h5 className="text-sm font-bold text-slate-900 mt-0.5">
                      {log.action} <span className="text-xs font-normal text-slate-400">• Handler: {log.admin_name}</span>
                    </h5>
                    <p className="text-xs text-slate-600 mt-1">
                      {log.remarks}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
