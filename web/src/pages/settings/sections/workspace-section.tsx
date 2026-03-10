import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleRow } from "../shared"

type WorkspaceSettings = {
  sharedLayouts: boolean
  autoExportReports: boolean
  activitySummary: boolean
}

type WorkspaceSectionProps = {
  workspaceSettings: WorkspaceSettings
  setWorkspaceSettings: (
    updater: (prev: WorkspaceSettings) => WorkspaceSettings
  ) => void
}

export function WorkspaceSection({
  workspaceSettings,
  setWorkspaceSettings,
}: WorkspaceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace Name</Label>
          <Input id="workspace-name" defaultValue="Query Trade Lab" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="export-format">Default Export Format</Label>
          <Input id="export-format" defaultValue="CSV + PDF Summary" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-notes">Workspace Notes</Label>
        <Textarea
          id="workspace-notes"
          placeholder="Capture team conventions, review checklist items, or reporting notes."
        />
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Shared Layouts"
          description="Let teammates reuse dashboard and backtest layouts."
          enabled={workspaceSettings.sharedLayouts}
          onToggle={() =>
            setWorkspaceSettings((prev) => ({
              ...prev,
              sharedLayouts: !prev.sharedLayouts,
            }))
          }
        />
        <ToggleRow
          label="Auto Export Reports"
          description="Create a report package automatically after completed strategy runs."
          enabled={workspaceSettings.autoExportReports}
          onToggle={() =>
            setWorkspaceSettings((prev) => ({
              ...prev,
              autoExportReports: !prev.autoExportReports,
            }))
          }
        />
        <ToggleRow
          label="Activity Summary"
          description="Show a weekly summary of workspace activity and strategy changes."
          enabled={workspaceSettings.activitySummary}
          onToggle={() =>
            setWorkspaceSettings((prev) => ({
              ...prev,
              activitySummary: !prev.activitySummary,
            }))
          }
        />
      </div>
    </div>
  )
}
