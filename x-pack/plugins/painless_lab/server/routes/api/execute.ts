/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../types';
import { API_BASE_PATH } from '../../../common/constants';
import { isEsError } from '../../lib';

const bodySchema = schema.object({
  script: schema.object({
    source: schema.string(),
    params: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  }),
  context: schema.maybe(schema.string()),
  context_setup: schema.maybe(
    schema.object({
      params: schema.maybe(schema.any()),
      document: schema.recordOf(schema.string(), schema.any()),
      index: schema.string(),
    })
  ),
});

export function registerExecuteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/execute`,
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const body = req.body;

      try {
        const callAsCurrentUser = ctx.core.elasticsearch.dataClient.callAsCurrentUser;

        const response = await callAsCurrentUser('scriptsPainlessExecute', {
          body,
        });

        return res.ok({
          body: response,
        });
      } catch (e) {
        if (isEsError(e)) {
          // Assume invalid painless script was submitted
          // Return 200 with error object
          return res.ok({
            body: e.body,
          });
        }
        return res.internalError({ body: e });
      }
    })
  );
}
