import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LiveActivityFeed() {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Activity className="h-4 w-4 text-zinc-500" />
          Live Activity
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Real-time platform events will appear here once an event stream is connected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-4 text-center">
          <p className="text-sm font-medium text-zinc-400">Coming Soon</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-600">
            Order created, driver accepted, payment succeeded, and store updates require a
            centralized event log (P2).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
