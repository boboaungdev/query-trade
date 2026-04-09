import api from "./axios"

export async function checkUserExist({ email }: { email: string }) {
  const { data } = await api.post("/auth/exist-user", {
    email,
  })

  return data
}

export async function signin({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const { data } = await api.post("/auth/signin", {
    email,
    password,
  })

  return data
}

export async function signup({
  email,
  name,
  username,
  password,
}: {
  email: string
  name: string
  username: string
  password: string
}) {
  const { data } = await api.post("/auth/signup", {
    email,
    name,
    username,
    password,
  })

  return data
}

export async function signupVerify({
  email,
  code,
}: {
  email: string
  code: string
}) {
  const { data } = await api.post("/auth/signup-verify", {
    email,
    code,
  })

  return data
}

export const signinGoogle = async (payload: {
  name: string
  email: string
  avatar: string
  googleId: string
}) => {
  const { data } = await api.post("/auth/signin-google", payload)
  return data
}

export async function forgotPassword({ email }: { email: string }) {
  const { data } = await api.post("/auth/forgot-password", {
    email,
  })

  return data
}

export async function forgotPasswordVerify({
  email,
  code,
}: {
  email: string
  code: string
}) {
  const { data } = await api.post("/auth/forgot-password-verify", {
    email,
    code,
  })

  return data
}

export async function resetPassword({
  email,
  newPassword,
}: {
  email: string
  newPassword: string
}) {
  const { data } = await api.post("/auth/reset-password", {
    email,
    newPassword,
  })

  return data
}

export async function signout() {
  const { data } = await api.post("/auth/signout")

  return data
}

export async function editProfile({
  name,
  username,
  avatar,
}: {
  name?: string
  username?: string
  avatar?: string
}) {
  const { data } = await api.patch("/auth", {
    name,
    username,
    avatar,
  })

  return data
}

export async function checkChangeEmail({
  newEmail,
  password,
}: {
  newEmail: string
  password: string
}) {
  const { data } = await api.post("/auth/check-change-email", {
    newEmail,
    password,
  })

  return data
}

export async function verifyChangeEmail({
  newEmail,
  newEmailCode,
}: {
  newEmail: string
  newEmailCode: string
}) {
  const { data } = await api.patch("/auth/verify-change-email", {
    newEmail,
    code: newEmailCode,
  })

  return data
}

export async function changePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string
  newPassword: string
}) {
  const { data } = await api.patch("/auth/change-password", {
    oldPassword: currentPassword,
    newPassword,
  })

  return data
}

export async function verifyChangePassword({
  email,
  code,
  newPassword,
}: {
  email: string
  code: string
  newPassword: string
}) {
  const { data } = await api.patch("/auth/verify-change-password", {
    email,
    code,
    newPassword,
  })

  return data
}

export async function createPassword({ password }: { password: string }) {
  const { data } = await api.patch("/auth/create-password", {
    password,
  })

  return data
}

export async function connectGoogle({ googleId }: { googleId: string }) {
  const { data } = await api.patch("/auth/connect-google", {
    googleId,
  })

  return data
}

export async function disconnectGoogle() {
  const { data } = await api.patch("/auth/disconnect-google")

  return data
}

export async function deleteAccountVerify() {
  const { data } = await api.post("/auth/delete")

  return data
}

export async function deleteAccount({
  password,
  code,
}: {
  password?: string
  code?: string
}) {
  const { data } = await api.delete("/auth/delete", {
    data: {
      password,
      code,
    },
  })

  return data
}
