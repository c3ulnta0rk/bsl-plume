export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const item = await getPhaseById(id)
  if (!item) throw createError({ statusCode: 404, message: 'Phase not found' })
  return item
})
