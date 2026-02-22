export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteSet(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Set not found' })
  return deleted
})
