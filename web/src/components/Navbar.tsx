import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import ThemeToggle from "./ThemeToggle"
import { APP_NAME } from "@/constants"

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b p-4">
      <h1 className="text-lg font-bold">{APP_NAME}</h1>

      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost">Home</Button>
        </Link>

        <Link to="/auth">
          <Button>Get start</Button>
        </Link>

        <ThemeToggle />
      </div>
    </nav>
  )
}
