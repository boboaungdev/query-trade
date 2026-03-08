export default function Dashboard() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <p className="mt-2 text-muted-foreground">
          Welcome to your dashboard 🚀
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">Manage your profile</p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Trading</h2>
            <p className="text-sm text-muted-foreground">
              View trading activity
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">Manage preferences</p>
          </div>
        </div>
      </div>
    </div>
  )
}
