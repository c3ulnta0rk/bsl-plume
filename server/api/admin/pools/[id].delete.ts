export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deletePool(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Pool not found' })
  return deleted
})
