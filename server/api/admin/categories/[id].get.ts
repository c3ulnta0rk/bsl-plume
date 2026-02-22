export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getCategoryById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Category not found' })
  return item
})
