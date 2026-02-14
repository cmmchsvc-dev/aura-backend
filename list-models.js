const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyDSmwnIIb0co_n8ZQcZcpnU4P1PlSdVQZ0';

async function listModels() {
  const genAI = new GoogleGenerativeAI(API_KEY);

  try {
    const models = await genAI.listModels();

    console.log('\n📋 Available Gemini Models:\n');

    for await (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('---');
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
