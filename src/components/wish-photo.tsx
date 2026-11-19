"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/shared/lib/api";
import { Button, Spinner } from "@/shared/ui/primitives";

const MaxBytes = 5 * 1024 * 1024;

/**
 * One picture for a material wish (not cash): a photo the recipient uploads, or the one found from a shop link. Gifters and vendors
 * see it, so they know exactly what's wanted. JPG, PNG or WebP up to 5 MB.
 */
export function WishPhotoPicker({ value, onChange, fromLink }: { value: string; onChange: (url: string) => void; /** The picture came from a pasted link. */ fromLink?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Choose a JPG, PNG or WebP photo.");
    if (file.size > MaxBytes) return setError("That photo is over 5 MB. Choose a smaller one.");
    setBusy(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("That photo couldn't be read."));
        reader.readAsDataURL(file);
      });
      const r = await api<{ url: string }>("/recipient/wish-images", { method: "POST", body: { fileName: file.name, dataBase64 } });
      onChange(r.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo couldn't be uploaded.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Your photo of this wish" className="size-12 rounded-lg object-cover ring-1 ring-ink-200" referrerPolicy="no-referrer" />
          <span>{fromLink ? "Picture from the link" : "Your photo"}</span>
          <Button size="sm" variant="ghost" icon={ImagePlus} disabled={busy} onClick={() => input.current?.click()}>Change</Button>
          <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={() => onChange("")}>Remove</Button>
        </>
      ) : (
        <Button size="sm" variant="secondary" icon={ImagePlus} disabled={busy} onClick={() => input.current?.click()}>Add a photo</Button>
      )}
      {busy && <Spinner label="Uploading" />}
      {error && <span role="alert" className="w-full text-danger-700">{error}</span>}
    </div>
  );
}
