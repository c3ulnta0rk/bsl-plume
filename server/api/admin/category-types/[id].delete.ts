export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteCategoryType(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Category type not found' })
  return deleted
})
