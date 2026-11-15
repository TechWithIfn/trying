"use client";

import { useState } from "react";
import { SUPPORT_EMAIL } from "@/config/site";

type ReportType = "copyright" | "privacy" | "broken-link" | "other";

export default function ReportForm() {
  const [type, setType] = useState<ReportType>("copyright");
  const [url, setUrl] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || !details.trim()) {
      setError("Please include the content URL and a short description.");
      return;
    }
    setError("");
    const subject =
      type === "copyright"
        ? "Copyright / DMCA report"
        : type === "privacy"
          ? "Privacy report"
          : type === "broken-link"
            ? "Broken link report"
            : "Content report";
    const body = [
      `Report type: ${type}`,
      `Content URL: ${url.trim()}`,
      `Name: ${name.trim() || "Not provided"}`,
      `Reply email: ${email.trim() || "Not provided"}`,
      "",
      "Details:",
      details.trim(),
      "",
      "I confirm this report is accurate and made in good faith.",
    ].join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-3 text-[15px] text-fg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";
  const label = "block text-[13px] font-semibold text-fg";

  return (
    <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
      <div>
        <label htmlFor="report-type" className={label}>
          What are you reporting?
        </label>
        <select
          id="report-type"
          value={type}
          onChange={(event) => setType(event.target.value as ReportType)}
          className={field}
        >
          <option value="copyright">Copyright / DMCA</option>
          <option value="privacy">Privacy or private content</option>
          <option value="broken-link">Broken or unsupported link</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label htmlFor="report-url" className={label}>
          Content URL <span aria-hidden="true">*</span>
        </label>
        <input
          id="report-url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.instagram.com/p/..."
          className={field}
          autoComplete="url"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="report-name" className={label}>
            Your name
          </label>
          <input
            id="report-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={field}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="report-email" className={label}>
            Reply email
          </label>
          <input
            id="report-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="report-details" className={label}>
          Details <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="report-details"
          required
          rows={6}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Describe the content, your relationship to it, and the action you are requesting."
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      )}

      <p className="text-[12.5px] leading-relaxed text-fg-subtle">
        This form opens your email app with the report pre-filled and sends it to{" "}
        {SUPPORT_EMAIL}. Nothing is uploaded to this website. For formal DMCA
        notices, include the elements listed on the{" "}
        <a href="/dmca" className="font-semibold text-primary-strong hover:underline">
          DMCA page
        </a>
        .
      </p>

      <button
        type="submit"
        className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Open email report
      </button>
    </form>
  );
}
