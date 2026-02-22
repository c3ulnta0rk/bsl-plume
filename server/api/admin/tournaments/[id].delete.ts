export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteTournament(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Tournament not found' })
  return deleted
})
