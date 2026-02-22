export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const updated = await updateCategory(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Category not found' })
  return updated
})
