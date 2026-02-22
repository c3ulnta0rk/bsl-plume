export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const updated = await updateCategoryType(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Category type not found' })
  return updated
})
