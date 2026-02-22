export default defineEventHandler(async (event) => {
  const body = await readBody<{
    matchId?: string
    setNumber?: number
    score1?: number
    score2?: number
  }>(event)
  if (!body?.matchId || body?.setNumber == null) {
    throw createError({ statusCode: 400, message: 'matchId and setNumber are required' })
  }
  return await createSet({
    matchId: body.matchId,
    setNumber: body.setNumber,
    score1: body.score1,
    score2: body.score2
  })
})
