export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getClubById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Club not found' })
  return item
})
