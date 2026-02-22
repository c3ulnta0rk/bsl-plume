export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getCategoryTypeById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Category type not found' })
  return item
})
