export default defineEventHandler(async (event) => {
  const body = await readBody<{ phaseId?: string, name?: string }>(event)
  if (!body?.phaseId || !body?.name?.trim()) {
    throw createError({ statusCode: 400, message: 'phaseId and name are required' })
  }
  return await createPool({ phaseId: body.phaseId, name: body.name.trim() })
})
