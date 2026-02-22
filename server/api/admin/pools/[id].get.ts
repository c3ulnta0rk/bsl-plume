export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getPoolById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Pool not found' })
  return item
})
