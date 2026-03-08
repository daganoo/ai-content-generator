const { DynamoDBClient, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { OpenAI } = require("openai");
const { v4: uuidv4 } = require("uuid");

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "content-generator-history";

const SYSTEM_PROMPTS = {
  blog: `You are an expert blog writer. Write engaging, well-structured blog posts with clear headings, 
         compelling introduction, detailed body sections, and strong conclusion. Use markdown formatting.`,
  product: `You are a world-class copywriter specializing in product descriptions. Write compelling, 
            benefit-focused copy that converts browsers into buyers. Highlight key features naturally.`,
  social: `You are a social media expert. Write highly engaging posts optimized for virality. 
           Use hooks, emojis strategically, and clear calls-to-action. Keep it punchy and shareable.`,
  email: `You are an email marketing specialist. Write professional emails with compelling subject lines, 
          personalized openers, clear value propositions, and strong CTAs. Optimize for open rates.`,
};

const buildPrompt = ({ type, topic, tone, keywords }) => {
  const keywordStr = keywords ? `\n\nInclude these keywords naturally: ${keywords}` : "";
  return `Write a ${type === "blog" ? "blog post" : type === "product" ? "product description" : type === "social" ? "social media post" : "email campaign"} about: "${topic}"\n\nTone: ${tone}${keywordStr}\n\nMake it professional, engaging, and ready to publish.`;
};

// Check DynamoDB cache (same topic + type in last 24h)
async function checkCache(type, topic) {
  try {
    const cacheKey = `${type}#${topic.toLowerCase().trim().slice(0, 50)}`;
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "cache-index",
      KeyConditionExpression: "cacheKey = :key",
      FilterExpression: "createdAt > :cutoff",
      ExpressionAttributeValues: marshall({
        ":key": cacheKey,
        ":cutoff": new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
      Limit: 1,
    }));
    return result.Items?.[0] ? { content: result.Items[0].content.S } : null;
  } catch {
    return null; // cache miss is fine
  }
}

async function saveToHistory({ id, type, topic, tone, keywords, content, tokens, userId }) {
  const cacheKey = `${type}#${topic.toLowerCase().trim().slice(0, 50)}`;
  await dynamo.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: marshall({
      id,
      userId: userId || "anonymous",
      type,
      topic,
      tone,
      keywords: keywords || "",
      content,
      tokens,
      cacheKey,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 day TTL
    }),
  }));
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { type, topic, tone = "Professional", keywords = "", userId } = body;

    // Validation
    if (!type || !topic) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "type and topic are required" }),
      };
    }

    if (!SYSTEM_PROMPTS[type]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Invalid type. Must be: ${Object.keys(SYSTEM_PROMPTS).join(", ")}` }),
      };
    }

    if (topic.length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Topic too long (max 500 chars)" }),
      };
    }

    // Check cache first
    const cached = await checkCache(type, topic);
    if (cached) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cached, cached: true, cost: "$0.000" }),
      };
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[type] },
        { role: "user", content: buildPrompt({ type, topic, tone, keywords }) },
      ],
      max_tokens: parseInt(process.env.MAX_TOKENS || "1000"),
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || "";
    const tokens = completion.usage?.total_tokens || 0;
    const cost = `$${((tokens / 1000) * 0.002).toFixed(4)}`; // gpt-3.5-turbo pricing

    // Save to DynamoDB
    const id = uuidv4();
    await saveToHistory({ id, type, topic, tone, keywords, content, tokens, userId });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id, content, tokens, cost, cached: false }),
    };
  } catch (error) {
    console.error("Lambda error:", error);

    if (error.status === 429) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error", message: error.message }),
    };
  }
};