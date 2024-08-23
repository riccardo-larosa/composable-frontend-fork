import {
  getCatalogRelease,
  publishCatalog,
} from "../../../../lib/catalog/publish-catalog"
import { ListrRendererFactory, ListrTaskWrapper } from "listr2/dist"
import { KlevuIntegrationTaskContext } from "../utility/types"
import {
  createCheckIfInstanceExistsTask,
  createCreateUrqlClientTask,
  createSwitchingToActiveStoreTask,
  getCustomerInfoTask,
  getIntegrationHubAuthTokenTask,
} from "../../shared/tasks/composer-tasks"
import { KLEVU_INTEGRATION_NAME } from "../utility/error-messages"
import { setupKlevuIntegrationTasks } from "./setup-klevu-integration-tasks"
import { setupKlevuCustomApiEntryTasks } from "./setup-klevu-custom-api-entry-tasks"

export function createKlevuTask({
  unsubscribe,
}: {
  unsubscribe: (() => void)[]
}) {
  return function InnerTaskFn<TContext extends KlevuIntegrationTaskContext>(
    _ctx: TContext,
    task: ListrTaskWrapper<
      TContext,
      ListrRendererFactory,
      ListrRendererFactory
    >,
  ) {
    return task.newListr(
      [
        createSwitchingToActiveStoreTask<KlevuIntegrationTaskContext>(),
        getIntegrationHubAuthTokenTask<KlevuIntegrationTaskContext>(),
        createCreateUrqlClientTask<KlevuIntegrationTaskContext>({
          unsubscribe,
        }),
        getCustomerInfoTask<KlevuIntegrationTaskContext>(),
        createCheckIfInstanceExistsTask<KlevuIntegrationTaskContext>({
          integrationName: KLEVU_INTEGRATION_NAME,
        }),
        {
          title: "Setup Klevu Integration",
          skip: (ctx) => !!ctx.instanceExists,
          task: setupKlevuIntegrationTasks,
          rendererOptions: { persistentOutput: true },
        },
        {
          title: "Setup custom api",
          task: setupKlevuCustomApiEntryTasks,
          rendererOptions: { persistentOutput: true },
        },
        {
          title: "Publish Catalog",
          task: async (ctx, currentTask) => {
            if (!ctx.catalog) {
              throw new Error(
                "Catalog is missing, failed to publish catalog for Klevu",
              )
            }

            currentTask.output = `Selected catalog ${ctx.catalog.attributes.name}`

            const publishResult = await publishCatalog(
              ctx.requester,
              ctx.catalog.id,
            )

            if (!publishResult.success) {
              throw new Error(
                `Failed to publish catalog - ${publishResult.error.message}`,
              )
            }

            let catalogStatus = publishResult.data.meta.release_status
            while (
              catalogStatus === "PENDING" ||
              catalogStatus === "IN_PROGRESS"
            ) {
              // Wait 3 seconds before checking the status again
              await timer(3000)
              const catalogStatusResult = await getCatalogRelease(
                ctx.requester,
                ctx.catalog.id,
                publishResult.data.id,
              )
              if (!catalogStatusResult.success) {
                throw new Error(
                  `Failed to get catalog status - ${catalogStatusResult.error.message}`,
                )
              }
              catalogStatus = catalogStatusResult.data.meta.release_status
            }

            if (catalogStatus === "FAILED") {
              throw new Error(
                `Failed to publish catalog - ${ctx.catalog.attributes.name} catalog`,
              )
            }
          },
        },
      ],
      {
        rendererOptions: {
          suffixSkips: true,
          collapseErrors: false,
        },
      },
    )
  }
}

const timer = (ms: number) => new Promise((res) => setTimeout(res, ms))