export default defineEventHandler(async (event) => {
  const categoryId = getRouterParam(event, 'id')!
  return await getPhasesByCategoryId(categoryId)
})
