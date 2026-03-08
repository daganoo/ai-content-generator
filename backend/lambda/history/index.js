const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-3" });
const TABLE_NAME = process.env.DYNAMODB_TABLE || "content-generator-history";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 50,
    }));

    const items = (result.Items || [])
      .map((item) => unmarshall(item))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    console.error("History error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to fetch history", items: [] }),
    };
  }
};