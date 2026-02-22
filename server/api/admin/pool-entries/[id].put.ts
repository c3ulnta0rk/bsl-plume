export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const updated = await updatePoolEntry(id, body)
  if (!updated) throw createError({ statusCode: 404, message: 'Pool entry not found' })
  return updated
})
