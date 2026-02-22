export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 50
  const offset = Number(query.offset) || 0
  const status = typeof query.status === 'string' ? query.status : undefined
  const search = typeof query.search === 'string' ? query.search : undefined
  return await getMatches({ limit, offset, status, search })
})
