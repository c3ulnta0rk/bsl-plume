export default defineEventHandler(async (event) => {
  const body = await readBody<{
    categoryId?: string
    name?: string
    type?: string
    phaseOrder?: number
    config?: unknown
    status?: string
  }>(event)
  if (!body?.categoryId || !body?.name?.trim() || !body?.type || body?.phaseOrder == null) {
    throw createError({ statusCode: 400, message: 'categoryId, name, type and phaseOrder are required' })
  }
  return await createPhase({
    categoryId: body.categoryId,
    name: body.name.trim(),
    type: body.type,
    phaseOrder: body.phaseOrder,
    config: body.config ?? {},
    status: body.status
  })
})
