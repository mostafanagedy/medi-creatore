const OpenAI = require('openai');

async function test() {
  console.log("Testing Omniroute connection...");
  try {
    const client = new OpenAI({
      apiKey: 'sk-24f94befea51ab78-38f5e2-a4c11ae0',
      baseURL: 'http://localhost:20128/dashboard/api-manager',
    });

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Can be anything if it acts as a router
      messages: [{ role: 'user', content: 'Say hello in Arabic' }],
    });

    console.log("✅ Success! Response:");
    console.log(res.choices[0].message.content);
  } catch (err) {
    console.error("❌ Failed:");
    console.error(err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

test();
