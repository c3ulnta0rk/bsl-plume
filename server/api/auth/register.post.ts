import { createUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = body?.email?.trim()
  const password = body?.password

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'Email et mot de passe requis'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      message: 'Le mot de passe doit contenir au moins 8 caractères'
    })
  }

  try {
    const passwordHash = await hashPassword(password)
    const user = await createUser(email, passwordHash)
    await setUserSession(event, {
      user: { id: user.id, email: user.email },
      loggedInAt: new Date()
    })
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_EXISTS') {
      throw createError({
        statusCode: 409,
        message: 'Un compte existe déjà avec cet email'
      })
    }
    throw err
  }
})
