/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { Navigate } from "react-router-dom"
import { CircleHelp, Loader2, PencilLine, X } from "lucide-react"
import { toast } from "sonner"

import { useAuthStore } from "@/store/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { editProfile } from "@/api/auth"

function sanitizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20)
}

type FormState = {
  name: string
  username: string
  avatar: string
}

export default function Profile() {
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isNameTipOpen, setIsNameTipOpen] = useState(false)
  const [isUsernameTipOpen, setIsUsernameTipOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState<FormState>({
    name: user?.name || "",
    username: user?.username || "",
    avatar: user?.avatar || "",
  })

  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  const hasChanged = useMemo(() => {
    if (!user) return false

    return (
      form.name.trim() !== user.name ||
      form.username.trim() !== user.username ||
      (form.avatar.trim() || "") !== (user.avatar || "")
    )
  }, [form, user])

  const isFormValid = useMemo(() => {
    if (!user) return false

    const nextName = form.name.trim()
    const nextUsername = form.username.trim()
    const isNameChanged = nextName !== user.name
    const isUsernameChanged = nextUsername !== user.username

    if (isNameChanged && !/^[A-Za-z0-9 ]{1,20}$/.test(nextName)) return false
    if (isUsernameChanged && !/^[a-z0-9]{6,20}$/.test(nextUsername))
      return false

    return true
  }, [form.name, form.username, user])

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const onCancel = () => {
    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
    })
    setIsEditing(false)
  }

  const onStartEditing = () => {
    setForm({
      name: user.name || "",
      username: user.username || "",
      avatar: user.avatar || "",
    })
    setIsEditing(true)
  }

  const onAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        avatar: typeof reader.result === "string" ? reader.result : prev.avatar,
      }))
    }

    reader.onerror = () => {
      toast.error("Failed to read selected image")
    }

    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const onSave = async () => {
    const nextName = form.name.trim()
    const nextUsername = form.username.trim()
    const nextAvatar = form.avatar.trim()
    const payload: { name?: string; username?: string; avatar?: string } = {}

    if (!isFormValid) return

    if (nextName !== user.name) {
      payload.name = nextName
    }

    if (nextUsername !== user.username) {
      payload.username = nextUsername
    }

    if ((nextAvatar || "") !== (user.avatar || "")) {
      payload.avatar = nextAvatar
    }

    if (Object.keys(payload).length === 0) return

    setIsSaving(true)

    const promise = editProfile(payload)

    toast.promise(promise, {
      loading: "Updating profile...",
      success: (data) => {
        updateUser({
          name: payload.name ?? user.name,
          username: payload.username ?? user.username,
          avatar:
            payload.avatar !== undefined
              ? payload.avatar || undefined
              : user.avatar,
        })
        setIsEditing(false)
        return data.message
      },
      error: (error: any) =>
        error?.response?.data?.message || "Failed to update profile!",
    })

    promise.finally(() => setIsSaving(false))
  }

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your personal information details.
        </p>

        <div className="mt-6 grid items-start gap-6 md:grid-cols-[280px_1fr]">
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Public Info</CardTitle>
              <CardDescription>Shown across your workspace.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={form.avatar || user.avatar}
                  alt={form.name || user.name}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div>
                <p className="text-lg font-semibold">
                  {form.name || user.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{form.username || user.username}
                </p>
              </div>

              <div className="text-xs text-muted-foreground">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                  Keep your account details up to date.
                </CardDescription>
              </div>

              {!isEditing ? (
                <Button onClick={onStartEditing}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage
                      src={form.avatar || user.avatar}
                      alt={form.name || user.name}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onAvatarSelect}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        Choose Avatar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Tooltip open={isNameTipOpen} onOpenChange={setIsNameTipOpen}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                        aria-label="Name requirements"
                        onClick={() => setIsNameTipOpen((prev) => !prev)}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Letters, numbers, and spaces only (1-20 characters).
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="name"
                  value={form.name}
                  disabled={!isEditing || isSaving}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Tooltip
                    open={isUsernameTipOpen}
                    onOpenChange={setIsUsernameTipOpen}
                  >
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex cursor-help items-center text-muted-foreground hover:text-foreground"
                        aria-label="Username requirements"
                        onClick={() => setIsUsernameTipOpen((prev) => !prev)}
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Lowercase letters and numbers only (6-20 characters).
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="username"
                  value={form.username}
                  disabled={!isEditing || isSaving}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      username: sanitizeUsername(event.target.value),
                    }))
                  }
                />
              </div>

              {isEditing && (
                <Button
                  onClick={onSave}
                  disabled={!hasChanged || isSaving || !isFormValid}
                  className="w-30"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
