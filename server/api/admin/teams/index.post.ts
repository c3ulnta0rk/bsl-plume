export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    playerOneId?: string
    playerTwoId?: string
    tournamentId?: string
    categoryId?: string
    seed?: number
  }>(event)
  if (!body?.name?.trim() || !body?.playerOneId || !body?.tournamentId || !body?.categoryId) {
    throw createError({ statusCode: 400, message: 'name, playerOneId, tournamentId and categoryId are required' })
  }
  return await createTeam({
    name: body.name.trim(),
    playerOneId: body.playerOneId,
    playerTwoId: body.playerTwoId ?? null,
    tournamentId: body.tournamentId,
    categoryId: body.categoryId,
    seed: body.seed ?? null
  })
})
