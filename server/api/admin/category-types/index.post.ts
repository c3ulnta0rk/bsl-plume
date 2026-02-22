export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string, type?: string, gender?: string }>(event)
  if (!body?.name?.trim() || !body?.type) {
    throw createError({ statusCode: 400, message: 'Name and type are required' })
  }
  return await createCategoryType({
    name: body.name.trim(),
    type: body.type,
    gender: body.gender ?? null
  })
})
