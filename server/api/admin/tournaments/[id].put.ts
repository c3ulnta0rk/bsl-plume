export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  if (body.date) body.date = new Date(body.date)
  const updated = await updateTournament(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Tournament not found' })
  return updated
})
