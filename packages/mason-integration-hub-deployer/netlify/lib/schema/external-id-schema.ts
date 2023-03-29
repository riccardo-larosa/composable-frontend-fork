import * as z from "zod"

export const supportedIntegrationHubEnvironmentSchema = z.union([
  z.literal("prod-eu"),
  z.literal("prod-us"),
  z.literal("integration"),
  z.literal("staging"),
])

export const externalIdSchema = z.tuple([
  z.string(),
  supportedIntegrationHubEnvironmentSchema,
  z.string(),
])

export type SupportedIntegrationHubEnvironment = z.TypeOf<
  typeof supportedIntegrationHubEnvironmentSchema
>
