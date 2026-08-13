"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Manual intake for one Facebook lead.
 *
 * There is no discovery here on purpose. Layken finds the business in a group,
 * a comment thread, a paid Messenger conversation, or a referral, and types it
 * in. Nothing in this application crawls Facebook or sends a message.
 */
export function ConceptIntakeForm({
  onCreated,
  hideIntro = false,
}: {
  onCreated: (conceptId: Id<"website_concepts">) => void;
  hideIntro?: boolean;
}) {
  const createConcept = useMutation(api.concepts.admin.create);

  const [businessName, setBusinessName] = useState("");
  const [facebookPageUrl, setFacebookPageUrl] = useState("");
  const [submittedWebsiteUrl, setSubmittedWebsiteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const conceptId = await createConcept({
        businessName,
        facebookPageUrl: facebookPageUrl || undefined,
        submittedWebsiteUrl: submittedWebsiteUrl || undefined,
        phone: phone || undefined,
        serviceArea: serviceArea || undefined,
        notes: notes || undefined,
      });

      setBusinessName("");
      setFacebookPageUrl("");
      setSubmittedWebsiteUrl("");
      setPhone("");
      setServiceArea("");
      setNotes("");

      toast.success("Looking the business up on Google...");
      onCreated(conceptId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the concept.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hideIntro ? null : (
        <div>
          <h2 className="text-base font-semibold">New concept</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Only the business name is required. Everything else improves the
            match and the page.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="concept-business-name">Business name *</Label>
        <Input
          id="concept-business-name"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Shay's Cleaning Services"
          autoComplete="off"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="concept-facebook">Facebook Page URL</Label>
        <Input
          id="concept-facebook"
          value={facebookPageUrl}
          onChange={(event) => setFacebookPageUrl(event.target.value)}
          placeholder="https://facebook.com/..."
          autoComplete="off"
          inputMode="url"
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Recorded for provenance only. The Page is never scraped — upload the
          logo and photos below, or ask the owner to send them.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="concept-service-area">Service area or city</Label>
        <Input
          id="concept-service-area"
          value={serviceArea}
          onChange={(event) => setServiceArea(event.target.value)}
          placeholder="Youngsville, LA"
          autoComplete="off"
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Used to find the right business on Google. Defaults to Acadiana,
          Louisiana.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="concept-website">Existing website</Label>
        <Input
          id="concept-website"
          value={submittedWebsiteUrl}
          onChange={(event) => setSubmittedWebsiteUrl(event.target.value)}
          placeholder="https://..."
          autoComplete="off"
          inputMode="url"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="concept-phone">Phone</Label>
        <Input
          id="concept-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(337) 555-0123"
          autoComplete="off"
          inputMode="tel"
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">
          The only number the page may show. Overrides whatever Google lists.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="concept-notes">Generation note (optional)</Label>
        <Textarea
          id="concept-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Extra business context or a one-off design direction for this page."
          rows={5}
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Added to the Kimi prompt only when filled. Use it for services, voice,
          CTA, or a specific direction for this concept.
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Creating..." : "Create and enrich"}
      </Button>
    </form>
  );
}
