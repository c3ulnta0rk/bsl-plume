export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')!
  return await getCategoriesByTournamentId(tournamentId)
})
