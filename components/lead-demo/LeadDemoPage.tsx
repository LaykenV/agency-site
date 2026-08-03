import type { LeadDemo } from "@/lib/lead-demos";
import { SoftServiceDemoPage } from "./SoftServiceDemoPage";
import { TradeDemoPage } from "./TradeDemoPage";

type LeadDemoPageProps = {
  demo: LeadDemo;
};

/**
 * Shared entry point for `/preview/[slug]`. Each prospect picks a template in
 * `lib/lead-demos.ts`; this dispatches to the renderer for that template.
 */
export function LeadDemoPage({ demo }: LeadDemoPageProps) {
  switch (demo.template) {
    case "trade-field":
      return <TradeDemoPage demo={demo} />;
    case "soft-service":
      return <SoftServiceDemoPage demo={demo} />;
  }
}
