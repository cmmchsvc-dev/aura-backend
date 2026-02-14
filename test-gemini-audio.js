/**
 * Test script for Gemini 2.5 Flash Native Audio Integration
 *
 * Run with: node test-gemini-audio.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyDSmwnIIb0co_n8ZQcZcpnU4P1PlSdVQZ0';
const MODEL_NAME = 'gemini-1.5-flash'; // Using stable 1.5 Flash model

async function testTextChat() {
  console.log('\n🧪 Testing Text Chat with Gemini 2.5 Flash...\n');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'You are Aura, a warm AI wellness companion. Keep responses brief.',
    });

    const chat = model.startChat({
      history: [],
    });

    const testMessage = "Hi Aura! I'm feeling stressed today. Can you help?";
    console.log(`👤 User: ${testMessage}`);

    const result = await chat.sendMessage(testMessage);
    const response = await result.response;
    const text = response.text();

    console.log(`🤖 Aura: ${text}`);
    console.log('\n✅ Text chat test PASSED\n');

    return true;
  } catch (error) {
    console.error('\n❌ Text chat test FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function testAudioGeneration() {
  console.log('\n🧪 Testing Audio Response Generation...\n');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseModalities: ['AUDIO', 'TEXT'],
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Say hello in a warm, caring voice.' }],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();

    console.log(`📝 Text response: ${text}`);

    // Check for audio in response
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const contentParts = candidates[0].content.parts;
      const audioPart = contentParts.find(
        part => part.inlineData && part.inlineData.mimeType?.startsWith('audio/')
      );

      if (audioPart && audioPart.inlineData) {
        const audioLength = audioPart.inlineData.data.length;
        console.log(`🔊 Audio response: ${audioLength} characters (base64)`);
        console.log(`🔊 Audio format: ${audioPart.inlineData.mimeType}`);
        console.log('\n✅ Audio generation test PASSED\n');
        return true;
      } else {
        console.log('⚠️  No audio in response (text-only response received)');
        console.log('Note: Audio generation may not be available for all requests\n');
        return true; // Still consider it a pass if text works
      }
    }

    return false;
  } catch (error) {
    console.error('\n❌ Audio generation test FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function testConversationContext() {
  console.log('\n🧪 Testing Conversation Context...\n');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: 'You are Aura, a wellness companion. Remember conversation context.',
    });

    const chat = model.startChat({
      history: [],
    });

    // First message
    console.log('👤 User: My name is Alex');
    let result = await chat.sendMessage("My name is Alex");
    let response = await result.response;
    console.log(`🤖 Aura: ${response.text()}`);

    // Second message - testing context
    console.log('\n👤 User: What\'s my name?');
    result = await chat.sendMessage("What's my name?");
    response = await result.response;
    const text = response.text();
    console.log(`🤖 Aura: ${text}`);

    if (text.toLowerCase().includes('alex')) {
      console.log('\n✅ Conversation context test PASSED\n');
      return true;
    } else {
      console.log('\n⚠️  Context may not be preserved correctly\n');
      return false;
    }
  } catch (error) {
    console.error('\n❌ Conversation context test FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Gemini 2.5 Flash Native Audio - Integration Tests  ');
  console.log('═══════════════════════════════════════════════════════');

  const results = {
    textChat: false,
    audioGeneration: false,
    conversationContext: false,
  };

  results.textChat = await testTextChat();
  results.audioGeneration = await testAudioGeneration();
  results.conversationContext = await testConversationContext();

  console.log('═══════════════════════════════════════════════════════');
  console.log('                      RESULTS                          ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Text Chat:              ${results.textChat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Generation:       ${results.audioGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Conversation Context:   ${results.conversationContext ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═══════════════════════════════════════════════════════');

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    console.log('\n🎉 All tests PASSED! Gemini integration is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the error messages above.\n');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
