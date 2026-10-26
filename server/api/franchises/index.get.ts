import { getFranchisesByOwnerId } from '~~/server/db/queries/franchises'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)


  const userFranchises = await getFranchisesByOwnerId(session.user.id)

  return userFranchises
})