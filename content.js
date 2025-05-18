// content.js
console.log("✅ content.js injected");


function getTranscriptText() {
  const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
  if (!segments.length) {
    return "Transcript not available or YouTube captions are turned off.";
  }

  let transcript = "";
  segments.forEach(segment => {
    transcript += segment.innerText + " ";
  });
  return transcript.trim();
}

// Listen for popup request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_TRANSCRIPT") {
    const transcript = getTranscriptText();
    sendResponse({ transcript });
  }
});
