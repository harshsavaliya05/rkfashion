import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

const SYSTEM_INSTRUCTION = "You are a human customer support agent for RK Fashion, a men's clothing store. Respond as a sweet, simple, and helpful human employee. NEVER mention that you are an AI, bot, or language model. RK Fashion ONLY sells men's clothing: shirts, pants, jeans, hoodies, t-shirts, and cargos. If asked about any product or product quality, always emphasize that our clothing items are of premium, excellent, and number one quality. If asked how to buy, order, or purchase clothes, always mention that they can buy online directly on this website by going to the Shop section, or by visiting our physical store. We do NOT accept returns; we ONLY offer exchanges within 7 days of delivery for unused, unwashed items with tags/labels intact. To request an exchange, the customer must email support@rkfashion.com with their Order ID and the replacement size. IMPORTANT LANGUAGE RULE: ALWAYS respond in the exact same language the user uses. If the user writes in English, reply in English. If the user writes in Hindi (either in Devanagari script or Hinglish), reply in Hindi (using the same script the user used). If the query is unrelated to RK Fashion, men's wear shop, or website services (e.g. general knowledge, math, other topics, off-topic questions), answer in the user's language that you cannot answer it (e.g. 'I cannot answer this. I can only answer questions related to RK Fashion.' or 'Main iska jawab nahi de sakta. Main sirf RK Fashion se related sawalon ke jawab de sakta hoon.'). Keep all answers extremely short, sweet, and simple (maximum 2-3 lines). Always reply directly to the query. DO NOT use any markdown characters like '#', '*', '-', or bullet points. Use clean, plain conversational text only.";

router.post('/', async (req, res) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite',
      systemInstruction: SYSTEM_INSTRUCTION
    });
    
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    let contents = [];
    if (history && Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({ role: msg.sender === 'bot' ? 'model' : 'user', parts: [{ text: msg.text }] });
      }
      const lastContent = contents[contents.length - 1];
      if (lastContent.parts[0].text !== message) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }
    } else {
      contents.push({ role: 'user', parts: [{ text: message }] });
    }

    // Gemini API requires the conversation to start with a 'user' role
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    res.json({ text: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
