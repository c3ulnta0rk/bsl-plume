export default defineEventHandler(async (event) => {
  const matchId = getRouterParam(event, 'id')!
  return await getSetsByMatchId(matchId)
})
