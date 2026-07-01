import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  "Errors",
  "Warnings",
  "Performance",
  "Slow Requests",
  "Realtime",
  "Offline Devices",
  "GPS",
  "Queues",
] as const;

export function MonitoringSectionsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SECTIONS.map((section) => (
        <Card key={section} className="border-zinc-800 bg-zinc-900/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-white">{section}</CardTitle>
            <CardDescription className="text-zinc-500">
              Monitoring surface for {section.toLowerCase()} — requires log ingestion (P3).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500">
              Coming Soon
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
