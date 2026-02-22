export default defineEventHandler(async (event) => {
  const categoryId = getRouterParam(event, 'id')!
  return await getTeamsByCategoryId(categoryId)
})
