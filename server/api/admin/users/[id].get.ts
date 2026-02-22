export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getUserById(id)
  if (!item) throw createError({ statusCode: 404, message: 'User not found' })
  return item
})
