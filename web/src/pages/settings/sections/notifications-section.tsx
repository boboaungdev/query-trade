import { ToggleRow } from "../shared"

type NotificationSettings = {
  priceAlerts: boolean
  weeklyDigest: boolean
  productNews: boolean
  securityAlerts: boolean
}

type NotificationsSectionProps = {
  notificationSettings: NotificationSettings
  setNotificationSettings: (
    updater: (prev: NotificationSettings) => NotificationSettings
  ) => void
}

export function NotificationsSection({
  notificationSettings,
  setNotificationSettings,
}: NotificationsSectionProps) {
  return (
    <div className="space-y-4">
      <ToggleRow
        label="Price Alerts"
        description="Notify me when watchlist assets hit my alert thresholds."
        enabled={notificationSettings.priceAlerts}
        onToggle={() =>
          setNotificationSettings((prev) => ({
            ...prev,
            priceAlerts: !prev.priceAlerts,
          }))
        }
      />
      <ToggleRow
        label="Weekly Digest"
        description="Send a weekly summary of performance, markets, and strategy changes."
        enabled={notificationSettings.weeklyDigest}
        onToggle={() =>
          setNotificationSettings((prev) => ({
            ...prev,
            weeklyDigest: !prev.weeklyDigest,
          }))
        }
      />
      <ToggleRow
        label="Product News"
        description="Updates about new features, maintenance windows, and releases."
        enabled={notificationSettings.productNews}
        onToggle={() =>
          setNotificationSettings((prev) => ({
            ...prev,
            productNews: !prev.productNews,
          }))
        }
      />
      <ToggleRow
        label="Security Alerts"
        description="Immediate alerts for suspicious logins or credential changes."
        enabled={notificationSettings.securityAlerts}
        onToggle={() =>
          setNotificationSettings((prev) => ({
            ...prev,
            securityAlerts: !prev.securityAlerts,
          }))
        }
      />
    </div>
  )
}
