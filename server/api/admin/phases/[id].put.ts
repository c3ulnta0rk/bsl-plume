export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const updated = await updatePhase(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Phase not found' })
  return updated
})
