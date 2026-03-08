import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Trading Backtesting</h1>

      <p className="mt-4 max-w-xl text-muted-foreground">
        Test algorithmic trading strategies, run historical backtests, and
        execute trades through exchange APIs in one platform.
      </p>

      <div className="mt-6 flex gap-4">
        <Link to="/auth">
          <Button size="lg">Get start</Button>
        </Link>

        <Button variant="outline" size="lg">
          Documentation
        </Button>
      </div>
    </div>
  )
}
