import "dotenv/config";

const groqKey = process.env.GROQ_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function checkGroq() {
  if (!groqKey) {
    console.log("[GROQ] missing GROQ_API_KEY");
    return;
  }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`[GROQ] failed: ${res.status} ${res.statusText}`);
      console.log(text.slice(0, 400));
      return;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    console.log("[GROQ] success:", content || "(no content)");
  } catch (err) {
    console.log("[GROQ] error:", err instanceof Error ? err.message : String(err));
  }
}

async function checkGemini() {
  if (!geminiKey) {
    console.log("[GEMINI] missing GEMINI_API_KEY");
    return;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8,
            responseMimeType: "text/plain",
          },
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`[GEMINI] failed: ${res.status} ${res.statusText}`);
      console.log(text.slice(0, 400));
      return;
    }
    const json = await res.json();
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("[GEMINI] success:", content || "(no content)");
  } catch (err) {
    console.log("[GEMINI] error:", err instanceof Error ? err.message : String(err));
  }
}

async function run() {
  await checkGroq();
  await checkGemini();
}

run();
