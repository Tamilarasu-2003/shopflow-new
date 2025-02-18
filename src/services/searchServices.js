// const { Client } = require("@elastic/elasticsearch");
// const elasticClient = new Client({ node: "http://localhost:9200" });

const { Client } = require("@opensearch-project/opensearch");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "ap-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const client = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    username: "Tamilarasu",
    password: "Tamil@9976",
  },
  awsConfig: new AWS.Config({
    region: "ap-south-1",
    credentials: new AWS.Credentials(
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY
    ),
  }),
});

const elasticSearch = async (query, offset, limit) => {
  if (!query) { throw new Error("Search query is required"); }

  const from = offset;
  const size = limit;

  let priceFilter = {};

  const underMatch = query.match(/under\s(\d+)/i);
  if (underMatch) {
    priceFilter["offerPrice"] = { lte: parseFloat(underMatch[1]) };
  }

  const aboveMatch = query.match(/above\s(\d+)/i);
  if (aboveMatch) {
    priceFilter["offerPrice"] = priceFilter["offerPrice"] || {};
    priceFilter["offerPrice"]["gte"] = parseFloat(aboveMatch[1]);
  }

  const betweenMatch = query.match(/between\s(\d+)\s(?:and|to)\s(\d+)/i);
  if (betweenMatch) {
    priceFilter["offerPrice"] = {
      gte: parseFloat(betweenMatch[1]),
      lte: parseFloat(betweenMatch[2]),
    };
  }

  const filterClause = Object.keys(priceFilter).length
    ? { filter: { range: priceFilter } }
    : {};

  const body = await client.search({
    index: "products",
    body: {
      from: from,
      size: size,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    match: {
                      name: {
                        query: query,
                        boost: 5,
                        fuzziness: "AUTO",
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        match: { name: query },
                      },
                      should: [
                        {
                          match: {
                            "category.name": {
                              query: query,
                              boost: 4,
                              fuzziness: "AUTO",
                            },
                          },
                        },
                        {
                          match: {
                            brand: {
                              query: query,
                              boost: 4,
                              fuzziness: "AUTO",
                            },
                          },
                        },
                        {
                          multi_match: {
                            query: query,
                            fields: ["description"],
                            boost: 2,
                            fuzziness: "AUTO",
                          },
                        },
                        {
                          match: {
                            "subCategory.name": {
                              query: query,
                              boost: 1,
                              fuzziness: "AUTO",
                            },
                          },
                        },
                        {
                          query_string: {
                            query: `*${query}*`,
                            fields: [
                              "name",
                              "category.name",
                              "subCategory.name",
                              "brand",
                              "description",
                            ],
                            boost: 0.5,
                          },
                        },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          ...(Object.keys(filterClause).length ? filterClause : {}),
        },
      },
    },
  });

  return body.body.hits
    ? {
        data: body.body.hits.hits.map((hit) => ({
          id: hit._id,
          ...hit._source,
        })),
        totalCount: body.body.hits.total.value,
      }
    : { data: [], totalCount: 0 };
};

module.exports = { elasticSearch };
