import type { VulcanDocument } from "@vulcanjs/schema";
import { createGraphqlModelServer } from "@vulcanjs/graphql/server";
import { createMongooseConnector } from "@vulcanjs/mongo";

export const EmailHash = createGraphqlModelServer({
  name: "EmailHashes",
  graphql: {
    typeName: "EmailHash",
    multiTypeName: "EmailHashes",

    mutationResolvers: null,

    queryResolvers: null,
  },

  schema: {
    _id: {
      type: String,
      optional: true,
      canRead: ["guests"],
    },
    userId: {
      type: String,
      optional: true,
    },
    // NOTE: if we don't have a email hash, we can use the userId instead
    // (for anonymous users)
    emailHash: {
      type: String,
      optional: true,
    },
    uuid: {
      type: String,
      optional: false,
    },
    /**
     * Legacy ulid
     * We don't need something as advanced for unique identification
     * because we don't want a timestamp
     *
     * Uuid is simpler and doesn't involve a timestamp
     */
    ulid: {
      type: String,
      optional: true,
    },
  },
});
export interface EmailHashDocument extends VulcanDocument {
  userId?: string;
  emailHash?: string;
  uuid: string;
}

export default EmailHash;
