export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deletePoolEntry(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Pool entry not found' })
  return deleted
})
