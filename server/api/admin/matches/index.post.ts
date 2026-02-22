export default defineEventHandler(async (event) => {
  const body = await readBody<{
    phaseId?: string
    poolId?: string
    team1Id?: string
    team2Id?: string
    round?: number
    bracketPosition?: number
    status?: string
    court?: string
    scheduledAt?: string
  }>(event)
  if (!body?.phaseId) {
    throw createError({ statusCode: 400, message: 'phaseId is required' })
  }
  return await createMatch({
    phaseId: body.phaseId,
    poolId: body.poolId ?? null,
    team1Id: body.team1Id ?? null,
    team2Id: body.team2Id ?? null,
    round: body.round ?? null,
    bracketPosition: body.bracketPosition ?? null,
    status: body.status,
    court: body.court ?? null,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null
  })
})
