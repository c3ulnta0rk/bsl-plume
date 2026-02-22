export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  if (body.scheduledAt) body.scheduledAt = new Date(body.scheduledAt)
  const updated = await updateMatch(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Match not found' })
  return updated
})
