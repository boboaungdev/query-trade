import api from "./axios"

export async function checkUserExist(email: string) {
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
  const { data } = await api.patch("/auth/update", {
    name,
    username,
    avatar,
  })

  return data
}
