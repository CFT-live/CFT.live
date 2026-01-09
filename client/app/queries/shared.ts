import { gql } from "graphql-request";

export const getMetadata = gql`
{
  _meta {
    block {
      number
      hash
      timestamp
      parentHash
    }
  }
}
`;

