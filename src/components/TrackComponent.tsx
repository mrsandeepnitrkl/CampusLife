/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Complaint, ComplaintLog, ComplaintStatus } from "../types.js";
import { Search, HelpCircle, Clock, Building, CheckCircle, FileText, ArrowLeft, Calendar, FileDown, Star } from "lucide-react";

interface TrackComponentProps {
  onBack: () => void;
}

export default function TrackComponent({ onBack }: TrackComponentProps) {
  const [ticketNumber, setTicketNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Complaint | null>(null);
  const [logs, setLogs] = useState<ComplaintLog[]>([]);
  const [error, setError] = useState("");

  // Feedback states
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackError, setFeedbackError] = useState<string>("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTicket(null);
    setLogs([]);
    setFeedbackRating(0);
    setHoverRating(0);
    setFeedbackComment("");
    setFeedbackError("");
    setFeedbackSuccess("");

    if (!ticketNumber.trim()) {
      return setError("Please enter a valid complaint number.");
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/complaints/track/${ticketNumber.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to locate complaint ticket.");
      }

      setTicket(data.complaint);
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || "No ticket matching that number was found. Check digits.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (t: Complaint) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>CampusCare Complaint Ticket Receipt - ${t.complaint_number}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; text-align: center; }
            .logo { font-size: 22px; font-weight: bold; color: #2563eb; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .row { display: flex; margin-bottom: 8px; }
            .label { font-weight: bold; width: 150px; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #dbeafe; color: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CampusCare Support System</div>
            <h2>Complaint Status Receipt</h2>
          </div>
          <div class="box">
            <div class="row"><div class="label">Complaint No:</div><div><strong>${t.complaint_number}</strong></div></div>
            <div class="row"><div class="label">Category:</div><div>${t.category}</div></div>
            <div class="row"><div class="label">Subject:</div><div>${t.subject}</div></div>
            <div class="row"><div class="label">Status:</div><div><span class="status">${t.status}</span></div></div>
            <div class="row"><div class="label">Assigned Desk:</div><div>${t.assigned_to}</div></div>
            <div class="row"><div class="label">Date Submitted:</div><div>${new Date(t.created_at).toLocaleString()}</div></div>
          </div>
          <h3>Description:</h3>
          <p style="white-space: pre-wrap; background: #f1f5f9; padding: 12px; border-radius: 6px;">${t.description}</p>
          ${t.resolution_notes ? `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 6px; margin-top: 16px;">
              <h4 style="color: #065f46; margin: 0 0 8px 0;">Official Resolution Note:</h4>
              <p style="margin: 0; white-space: pre-wrap;">${t.resolution_notes}</p>
            </div>
          ` : ""}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
      setTicket(data.complaint);
      
      // Reload logs
      const logsRes = await fetch(`/api/complaints/track/${data.complaint.complaint_number}`);
      const logsData = await logsRes.json();
      if (!logsData.error) {
        setLogs(logsData.logs || []);
      }
    } catch (err: any) {
      setFeedbackError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div id="tracking-portal" className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login Portal
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold font-sans text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" />
          Public Ticket Tracking
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Search the live status, resolution notes, and chronologically mapped timeline of any CampusCare ticket instantly.
        </p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          type="text"
          required
          placeholder="Enter ticket number (e.g. CSP-2026-000101)"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono font-bold tracking-widest uppercase text-center"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl shadow transition-colors text-sm shrink-0"
        >
          {loading ? "Searching..." : "Track"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {ticket && (
        <div className="mt-8 border-t border-slate-150 dark:border-slate-800 pt-6 space-y-6 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider font-mono px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 rounded">
                {ticket.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">{ticket.subject}</h3>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Submitted {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
            
            <button
              onClick={() => handlePrint(ticket)}
              className="p-2 bg-slate-50 border hover:bg-slate-100 rounded-xl transition-colors text-slate-600 flex items-center gap-1.5 text-xs font-semibold"
            >
              <FileDown className="h-4 w-4 text-blue-500" />
              Receipt
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Status</p>
              <span className="inline-block px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-xs font-bold mt-1">
                {ticket.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Handling desk</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {ticket.assigned_to}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Original complaint</h4>
            <p className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-xl text-xs leading-relaxed text-slate-700 dark:text-slate-300 border whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {ticket.resolution_notes && (
            <div className="bg-emerald-50 border border-emerald-100/75 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Official Resolution notes</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{ticket.resolution_notes}</p>
            </div>
          )}

          {/* Feedback Section */}
          {(ticket.status === ComplaintStatus.RESOLVED || ticket.status === ComplaintStatus.CLOSED) && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-6 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Star className="h-4.5 w-4.5 text-blue-500 fill-current" />
                Service Experience Feedback
              </h4>
              
              {ticket.feedback ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= ticket.feedback!.rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-2">
                      ({ticket.feedback.rating}/5 Rating)
                    </span>
                  </div>
                  {ticket.feedback.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{ticket.feedback.comment}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Feedback submitted on {new Date(ticket.feedback.created_at).toLocaleString()}
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
                    onClick={() => handleFeedbackSubmit(ticket.complaint_id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                  >
                    {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Timeline updates</h4>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No logs recorded yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-2 pl-4 space-y-4">
                {logs.map((log) => (
                  <div key={log.log_id} className="relative">
                    <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600"></div>
                    <p className="text-[9px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                    <h5 className="text-xs font-bold text-slate-900 mt-0.5">{log.action}</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">{log.remarks}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
