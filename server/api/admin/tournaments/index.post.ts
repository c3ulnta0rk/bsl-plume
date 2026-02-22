export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name?: string
    clubId?: string
    date?: string
    location?: string
    status?: string
  }>(event)
  if (!body?.name?.trim() || !body?.clubId) {
    throw createError({ statusCode: 400, message: 'Name and clubId are required' })
  }
  return await createTournament({
    name: body.name.trim(),
    clubId: body.clubId,
    date: body.date ? new Date(body.date) : undefined,
    location: body.location,
    status: (body.status as 'draft' | 'published' | 'archived') ?? undefined
  })
})
