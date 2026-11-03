"use client";

import { useEffect, useState } from "react";
import { Flag, MapPin, ShieldCheck } from "lucide-react";
import { api, ApiError, useApi, useMutation } from "@/shared/lib/api";
import { Button, Card, CardHeader, Field, Input, Notice, PageHeader, Select, Textarea } from "@/shared/ui/primitives";
import { NotificationPreferences, SupportCenter } from "@/shared/ui/account";
import { useToast } from "@/shared/ui/overlay";

type Me = { name: string; email: string; phone: string; city: string; address: string };
const cities = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Kano"];

export default function PrivacyPage() {
  const { data: me } = useApi<Me>("/me");
  const toast = useToast();
  const [profile, setProfile] = useState({ address: "", city: "Lagos", phone: "" });
  const [report, setReport] = useState({ kind: "suspicious", details: "" });
  const [reportError, setReportError] = useState<string | null>(null);
  useEffect(() => { if (me) setProfile({ address: me.address, city: me.city, phone: me.phone }); }, [me]);
  const saveProfile = useMutation(() => api("/recipient/profile", { method: "PUT", body: profile }));
  const sendReport = useMutation(() => api<{ reference: string }>("/recipient/report", { method: "POST", body: report }));
  const fieldErrors = saveProfile.error instanceof ApiError ? saveProfile.error.errors : undefined;
  const addrError = fieldErrors?.address?.[0] ?? null;
  const otherError = saveProfile.error && !fieldErrors ? saveProfile.error.message : null;

  return (
    <>
      <PageHeader title="Privacy & settings" description="Control how gifts reach you and what people can see." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact & delivery details" description="Your phone and city let SecretWish, vendors and couriers reach you, even for cash gifts. Your address is only needed for physical gifts." />
          <div className="space-y-4 p-5">
            <Notice tone="plum" icon={ShieldCheck}>Senders never see your address — only your first name and city.</Notice>
            <Field label="Delivery address" hint="Needed before anyone can send you a physical gift from your wishlist." error={addrError}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!addrError} autoComplete="street-address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" required error={fieldErrors?.city?.[0]}>
                {(id) => (
                  <Select id={id} value={profile.city || ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })}>
                    {!profile.city && <option value="">Choose your city</option>}
                    {cities.map((c) => (<option key={c}>{c}</option>))}
                  </Select>
                )}
              </Field>
              <Field label="Phone number" required error={fieldErrors?.phone?.[0]}>{(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!fieldErrors?.phone} type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+234 …" />}</Field>
            </div>
            {otherError && <Notice tone="danger">{otherError}</Notice>}
            <Button icon={MapPin} loading={saveProfile.pending} onClick={async () => { if ((await saveProfile.run()) !== undefined) toast({ tone: "success", title: "Details saved" }); }}>Save details</Button>
          </div>
        </Card>
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
