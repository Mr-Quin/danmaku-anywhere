import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

export const statement = {
  ...defaultStatements,
  config: [],
} as const satisfies Record<string, readonly string[]>

export const ac = createAccessControl(statement)

export const userRole = ac.newRole({
  config: [],
})

export const moderatorRole = ac.newRole({
  config: [],
})

export const adminRole = ac.newRole({
  config: [],
  ...adminAc.statements,
})
