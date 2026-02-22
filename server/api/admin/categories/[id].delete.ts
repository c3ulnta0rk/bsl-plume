export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteCategory(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Category not found' })
  return deleted
})
