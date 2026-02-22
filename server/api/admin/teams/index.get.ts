export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 50
  const offset = Number(query.offset) || 0
  const search = typeof query.search === 'string' ? query.search : undefined
  return await getTeams({ limit, offset, search })
})
