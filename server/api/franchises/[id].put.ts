import { insertFranchiseSchema } from '~~/server/db/schemas'
import { updateFranchise } from '~~/server/db/queries/franchises'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)


  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const body = await readValidatedBody(event, (body) => insertFranchiseSchema.partial().parse(body))
  
  const updatedFranchise = await updateFranchise(parseInt(id), session.user.id, body)

  if (!updatedFranchise) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Franchise not found or access denied'
    })
  }

  return updatedFranchise
})