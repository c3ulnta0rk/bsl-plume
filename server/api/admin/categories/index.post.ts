export default defineEventHandler(async (event) => {
  const body = await readBody<{
    tournamentId?: string
    categoryTypeId?: string
    maxTeams?: number
    status?: string
  }>(event)
  if (!body?.tournamentId || !body?.categoryTypeId) {
    throw createError({ statusCode: 400, message: 'tournamentId and categoryTypeId are required' })
  }
  return await createCategory({
    tournamentId: body.tournamentId,
    categoryTypeId: body.categoryTypeId,
    maxTeams: body.maxTeams ?? null,
    status: body.status
  })
})
