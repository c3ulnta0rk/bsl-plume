import { getUserByEmail } from '../../utils/users'

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

  const user = await getUserByEmail(email)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Identifiants incorrects'
    })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    throw createError({
      statusCode: 401,
      message: 'Identifiants incorrects'
    })
  }

  await setUserSession(event, {
    user: { id: user.id, email: user.email },
    loggedInAt: new Date()
  })

  return { success: true }
})
