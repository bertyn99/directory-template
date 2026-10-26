import { deleteFranchise } from '~~/server/db/queries/franchises'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)


  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }
  
  const deletedFranchise = await deleteFranchise(parseInt(id), session.user.id)

  if (!deletedFranchise) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Franchise not found or access denied'
    })
  }

  return { success: true }
})