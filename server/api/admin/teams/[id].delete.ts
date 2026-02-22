export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteTeam(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Team not found' })
  return deleted
})
