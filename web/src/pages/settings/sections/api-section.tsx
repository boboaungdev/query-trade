import { Webhook } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ApiSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium">Primary API Key</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Used by your active trading automations and scripts.
            </p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            Rotate Key
          </Button>
        </div>
        <div className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">
          qt_live_x8s3••••••••••••••91
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <div className="relative">
            <Webhook className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              id="webhook-url"
              className="pl-9"
              placeholder="https://your-app.com/webhooks/trades"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowed-ips">Allowed IPs</Label>
          <Input id="allowed-ips" placeholder="192.168.1.10, 192.168.1.11" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api-notes">Integration Notes</Label>
        <Textarea
          id="api-notes"
          placeholder="Document how this API key is used, owners, rotation schedule, or failover notes."
        />
      </div>
    </div>
  )
}
