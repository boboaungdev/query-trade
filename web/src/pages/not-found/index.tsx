import { Link } from "react-router-dom"
import { Compass, Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth"

export default function NotFoundPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Card>
        <CardContent className="p-4 md:p-6">
          <p className="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Compass className="h-3.5 w-3.5 text-primary" />
            Page Not Found
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            404
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            The page you are looking for does not exist or may have been moved.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 md:p-5">
          <Button type="button" asChild>
            <Link to={isAuthenticated ? "/dashboard" : "/"}>
              <Home className="h-4 w-4" />
              {isAuthenticated ? "Go to Dashboard" : "Go to Home"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
