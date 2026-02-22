export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getTeamById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Team not found' })
  return item
})
