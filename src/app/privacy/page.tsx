"use client";

import { useState } from "react";
import { Flag, ShieldCheck } from "lucide-react";
import { api, useMutation } from "@/shared/lib/api";
import { Button, Card, CardHeader, Field, Notice, PageHeader, Select, Textarea } from "@/shared/ui/primitives";
import { NotificationPreferences, ProfileDetails, SupportCenter } from "@/shared/ui/account";
import { useToast } from "@/shared/ui/overlay";

export default function PrivacyPage() {
  const toast = useToast();
  const [report, setReport] = useState({ kind: "suspicious", details: "" });
  const [reportError, setReportError] = useState<string | null>(null);
  const sendReport = useMutation(() => api<{ reference: string }>("/recipient/report", { method: "POST", body: report }));

  return (
    <>
      <PageHeader title="Privacy & settings" description="Control how gifts reach you and what people can see." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileDetails
          description="Your phone and city let VeilWish (SecretWish), vendors and couriers reach you, even for cash gifts. Your address is only needed for physical gifts."
          notice={<Notice tone="plum" icon={ShieldCheck}>Senders never see your address — only your first name and city.</Notice>}
        />
        <NotificationPreferences />
      </div>

      <Card className="mt-6">
        <CardHeader title="Report something" description="Suspicious messages, unwanted gifts or anything that doesn't feel right. Reports go straight to our safety team." />
        <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr_auto] md:items-end">
          <Field label="What's happening?">
            {(id) => (
              <Select id={id} value={report.kind} onChange={(e) => setReport({ ...report, kind: e.target.value })}>
                <option value="suspicious">Suspicious activity</option>
                <option value="unwanted">Unwanted gift or contact</option>
              </Select>
            )}
          </Field>
          <Field label="Details" required error={reportError}>
            {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!reportError} className="min-h-[44px]" value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} />}
          </Field>
          <Button
            variant="danger"
            icon={Flag}
            loading={sendReport.pending}
            onClick={async () => {
              if (report.details.trim().length < 10) return setReportError("Please describe what happened (at least 10 characters).");
              setReportError(null);
              const r = await sendReport.run();
              if (r) {
                toast({ tone: "success", title: `Report ${r.reference} received`, body: "Our safety team will review it urgently." });
                setReport({ kind: "suspicious", details: "" });
              }
            }}
          >
            Send report
          </Button>
        </div>
      </Card>

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold text-plum-900">Help & support</h2>
      <SupportCenter />
    </>
  );
}
