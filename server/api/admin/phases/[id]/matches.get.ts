export default defineEventHandler(async (event) => {
  const phaseId = getRouterParam(event, 'id')!
  return await getMatchesByPhaseId(phaseId)
})
