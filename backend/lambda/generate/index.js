const { DynamoDBClient, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { v4: uuidv4 } = require("uuid");
const https = require("https");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-3" });
const TABLE_NAME = process.env.DYNAMODB_TABLE || "content-generator-history";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

function groqRequest(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const options = {
      hostname: "api.groq.com",
      path: "/openai/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || "Groq error"));
          resolve(parsed);
        } catch (e) {
          reject(new Error("Failed to parse Groq response"));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildPrompt(type, topic, tone, keywords) {
  const keywordsText = keywords ? `Include these keywords: ${keywords}.` : "";

  const prompts = {
    blog: `Write a professional blog post about "${topic}". Tone: ${tone}. ${keywordsText}
Format with a title, introduction, 3 main sections with subheadings, and a conclusion. Use markdown formatting.`,

    product: `Write a compelling product description for "${topic}". Tone: ${tone}. ${keywordsText}
Include: headline, key features (bullet points), benefits, and a call-to-action. Use markdown formatting.`,

    social: `Write an engaging social media post about "${topic}". Tone: ${tone}. ${keywordsText}
Include hooks, emojis, and relevant hashtags. Make it shareable and concise.`,

    email: `Write a marketing email about "${topic}". Tone: ${tone}. ${keywordsText}
Include: subject line, greeting, body with value proposition, call-to-action, and sign-off. Use markdown formatting.`,
  };

  return prompts[type] || prompts.blog;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  try {
    const { type = "blog", topic, tone = "Professional", keywords = "" } = JSON.parse(event.body || "{}");

    if (!topic) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Topic is required" }),
      };
    }

    if (!GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "GROQ_API_KEY not configured" }),
      };
    }

    // Check DynamoDB cache first (same topic+type in last 24h)
    const cacheKey = `${type}:${topic.toLowerCase().trim()}`;
    try {
      const cached = await dynamo.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "CacheIndex",
        KeyConditionExpression: "cacheKey = :ck",
        FilterExpression: "createdAt > :ts",
        ExpressionAttributeValues: marshall({
          ":ck": cacheKey,
          ":ts": new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        }),
        Limit: 1,
      }));

      if (cached.Items && cached.Items.length > 0) {
        const item = unmarshall(cached.Items[0]);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ content: item.content, cached: true, id: item.id }),
        };
      }
    } catch (cacheErr) {
      // Cache miss or index not ready — continue to generation
      console.log("Cache check skipped:", cacheErr.message);
    }

    // Call Groq API
    const prompt = buildPrompt(type, topic, tone, keywords);
    const response = await groqRequest([
      { role: "system", content: "You are a professional content writer. Write high-quality, engaging content." },
      { role: "user", content: prompt },
    ]);

    const content = response.choices[0].message.content;
    const id = uuidv4();

    // Save to DynamoDB
    try {
      await dynamo.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          id,
          cacheKey,
          type,
          topic,
          tone,
          keywords,
          content,
          model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
          createdAt: new Date().toISOString(),
        }),
      }));
    } catch (dbErr) {
      console.log("DynamoDB save failed:", dbErr.message);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ content, cached: false, id }),
    };
  } catch (err) {
    console.error("Handler error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error", message: err.message }),
    };
  }
};