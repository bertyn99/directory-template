import { insertFranchiseSchema } from '~~/server/db/schemas'
import { createFranchise } from '~~/server/db/queries/franchises'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)


  const body = await readValidatedBody(event, (body) => insertFranchiseSchema.parse(body))
  
  const newFranchise = await createFranchise({
    ...body,
    ownerId: session.user.id
  })

  return newFranchise
})