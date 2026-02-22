export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getTournamentById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Tournament not found' })
  return item
})
