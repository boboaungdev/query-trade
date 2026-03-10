import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleRow } from "../shared"

type TradingSettings = {
  confirmOrders: boolean
  autosaveBacktests: boolean
  riskWarnings: boolean
}

type TradingSectionProps = {
  tradingSettings: TradingSettings
  setTradingSettings: (
    updater: (prev: TradingSettings) => TradingSettings
  ) => void
}

export function TradingSection({
  tradingSettings,
  setTradingSettings,
}: TradingSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="base-currency">Base Currency</Label>
          <Input id="base-currency" defaultValue="USD" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slippage">Default Slippage</Label>
          <Input id="slippage" defaultValue="0.50%" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max-risk">Max Risk Per Trade</Label>
          <Input id="max-risk" defaultValue="1.50%" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-window">Default Session Window</Label>
          <Input id="session-window" defaultValue="US Market Hours" />
        </div>
      </div>

      <div className="space-y-4">
        <ToggleRow
          label="Confirm Live Orders"
          description="Require an extra confirmation step before live execution."
          enabled={tradingSettings.confirmOrders}
          onToggle={() =>
            setTradingSettings((prev) => ({
              ...prev,
              confirmOrders: !prev.confirmOrders,
            }))
          }
        />
        <ToggleRow
          label="Autosave Backtests"
          description="Store draft backtest runs automatically while you edit inputs."
          enabled={tradingSettings.autosaveBacktests}
          onToggle={() =>
            setTradingSettings((prev) => ({
              ...prev,
              autosaveBacktests: !prev.autosaveBacktests,
            }))
          }
        />
        <ToggleRow
          label="Risk Warnings"
          description="Show warnings when position size or leverage exceeds your defaults."
          enabled={tradingSettings.riskWarnings}
          onToggle={() =>
            setTradingSettings((prev) => ({
              ...prev,
              riskWarnings: !prev.riskWarnings,
            }))
          }
        />
      </div>
    </div>
  )
}
