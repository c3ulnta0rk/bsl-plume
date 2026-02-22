export default defineEventHandler(async (event) => {
  const body = await readBody<{ poolId?: string, teamId?: string, finalRank?: number }>(event)
  if (!body?.poolId || !body?.teamId) {
    throw createError({ statusCode: 400, message: 'poolId and teamId are required' })
  }
  return await createPoolEntry({
    poolId: body.poolId,
    teamId: body.teamId,
    finalRank: body.finalRank ?? null
  })
})
