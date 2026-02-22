export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getMatchById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Match not found' })
  return item
})
