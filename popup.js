document.getElementById("summarizeButton").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  const summaryEl = document.getElementById("summary");

  statusEl.textContent = "Fetching transcript...";

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Request transcript from content.js
  chrome.tabs.sendMessage(tab.id, { type: "GET_TRANSCRIPT" }, async (response) => {

    if (chrome.runtime.lastError) {
        document.getElementById("status").textContent =
            "Could not connect to YouTube page. Make sure you're on a video page with transcript.";
        return;
    }

    if (!response || !response.transcript || response.transcript.includes("Transcript not available")) {
      statusEl.textContent = "Transcript not available. Open the transcript manually if possible.";
      return;
    }

    const transcript = response.transcript;
    statusEl.textContent = "Summarizing...";

    const summary = await summarizeWithHuggingFace(transcript);
    summaryEl.textContent = summary;
    statusEl.textContent = "Done";
  });
});

async function summarizeWithHuggingFace(transcript) {
  const apiKey = "hf_xxx"; // !! API KEY !!
  //const model = "google/pegasus-xsum";
  //const model = "philschmid/bart-large-cnn-samsum";
  const model= "Falconsai/text_summarization";
  const maxChunkLength = 800;

  // Clean transcript for better results
  transcript = transcript
    .replace(/\[.*?\]|\d+:\d+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(uh|um|like|you know)/gi, '')
    .trim();

  const chunks = transcript.match(new RegExp(`.{1,${maxChunkLength}}`, 'g')) || [];
  const summaries = [];

  for (const chunk of chunks.slice(0, 5)) {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: chunk })
    });

    if (!response.ok) {
      const text = await response.text();
      summaries.push(`API request failed: ${response.status} ${text}`);
      continue;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      summaries.push(`Response parsing failed: ${text}`);
      continue;
    }

    console.log("Chunk sent:", chunk);
    console.log("Model response:", data);

    if (data?.error) {
      summaries.push(`API Error: ${data.error}`);
      continue;
    }

    summaries.push(data[0]?.summary_text || "<No summary>");
  }

  return summaries.join("\n\n");
}

document.getElementById("copyButton").addEventListener("click", () => {
  const text = document.getElementById("summary").textContent;

  navigator.clipboard.writeText(text)
    .then(() => {
      const btn = document.getElementById("copyButton");
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = "Copy to Clipboard", 2000);
    })
    .catch(err => {
      console.error("Copy failed:", err);
      alert("Failed to copy summary.");
    });
});

