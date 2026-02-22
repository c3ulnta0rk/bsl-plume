export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteClub(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Club not found' })
  return deleted
})
