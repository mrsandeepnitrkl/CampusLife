/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface CaptchaComponentProps {
  onValidated: (token: string, answer: string) => void;
  resetTrigger?: number;
}

export default function CaptchaComponent({ onValidated, resetTrigger = 0 }: CaptchaComponentProps) {
  const [question, setQuestion] = useState("");
  const [token, setToken] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captcha/generate");
      const data = await res.json();
      setQuestion(data.question);
      setToken(data.captchaToken);
      setAnswerInput("");
      onValidated(data.captchaToken, "");
    } catch (err) {
      console.error("Error loading captcha:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, [resetTrigger]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAnswerInput(val);
    onValidated(token, val);
  };

  return (
    <div id="captcha-container" className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase font-sans">
          Security Verification (CAPTCHA)
        </label>
        <button
          type="button"
          onClick={fetchCaptcha}
          disabled={loading}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh Puzzle
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-base font-bold text-slate-800 dark:text-slate-200 tracking-wide select-none">
          {loading ? "..." : question}
        </div>
        <input
          type="text"
          placeholder="Enter result"
          value={answerInput}
          onChange={handleInputChange}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
        />
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Solve this math verification puzzle to secure your request against automated spam.
      </p>
    </div>
  );
}
