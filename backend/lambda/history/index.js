const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE_NAME = process.env.DYNAMODB_TABLE || "content-generator-history";

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const userId = event.queryStringParameters?.userId || "anonymous";
    const limit = parseInt(event.queryStringParameters?.limit || "20");

    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "userId-createdAt-index",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": { S: userId } },
      ScanIndexForward: false, // newest first
      Limit: Math.min(limit, 50),
    }));

    const items = (result.Items || []).map(unmarshall).map(({ id, type, topic, tone, createdAt, tokens, cost }) => ({
      id, type, topic, tone, createdAt, tokens, cost,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items, count: items.length }),
    };
  } catch (error) {
    console.error("History fetch error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch history" }),
    };
  }
};