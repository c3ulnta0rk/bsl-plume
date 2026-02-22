export default defineEventHandler(async (event) => {
  const poolId = getRouterParam(event, 'id')!
  return await getPoolEntriesByPoolId(poolId)
})
