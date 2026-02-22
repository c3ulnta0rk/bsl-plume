export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string }>(event)
  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }
  return await createClub({ name: body.name.trim() })
})
