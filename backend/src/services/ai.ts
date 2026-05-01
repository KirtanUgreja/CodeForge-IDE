import 'dotenv/config'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `
You are an expert AI Coding Assistant.
- You have access to the full project file tree and the content of the currently active file.
- Use the file tree to identify where specific information (like certificates, models, or routes) might be located.
- If the user asks for information that is likely inside a file you haven't seen yet, point them to that file and offer to analyze it once they open it.
- NEVER say "I cannot directly interact" or "I lack capability". Instead, say "I can see the following files in your project..." and provide help based on the structure.
- Be technical, concise, and extremely helpful.
`;

export async function chatWithAI(messages: any[], model: string = 'google/gemini-2.0-flash-001') {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY is not configured in .env');
    }

    // Prepend system prompt if not present
    const fullMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
    ];

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://codeforgehub.com',
                'X-Title': 'CodeForge Hub',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI Service] Response Error:', errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from AI model');
        }
        return data.choices[0].message;
    } catch (error: any) {
        console.error('[AI Service] Error:', error);
        throw error;
    }
}

export async function getAutocomplete(prefix: string, suffix: string, filename: string) {
    if (!OPENROUTER_API_KEY) return '';

    const prompt = `
You are a code completion engine (Copilot-style).
Context:
Filename: ${filename}
---
CODE BEFORE CURSOR:
${prefix}
---
CODE AFTER CURSOR:
${suffix}
---
Task: Provide only the code that should be inserted at the cursor position. 
Rules:
1. Return ONLY the code snippet.
2. Do NOT include markdown blocks (\`\`\`).
3. Do NOT repeat the prefix or suffix.
4. Keep it concise (1-10 lines).
5. Match the indentation level of the prefix.
`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://codeforgehub.com',
                'X-Title': 'CodeForge Hub Autocomplete',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 256,
            }),
        });

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '';
        
        // Clean up markdown if AI ignored rules
        content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '');
        
        return content;
    } catch (error) {
        console.error('[Autocomplete] Error:', error);
        return '';
    }
}
