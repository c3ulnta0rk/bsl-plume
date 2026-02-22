export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deletePhase(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Phase not found' })
  return deleted
})
