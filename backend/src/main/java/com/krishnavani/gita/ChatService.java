package com.krishnavani.gita;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final GeminiClient gemini;
    private final ChatMemory memory;

    public ChatService(GeminiClient gemini, ChatMemory memory) {
        this.gemini = gemini;
        this.memory = memory;
    }

    /** Typed message: text reply only (no audio), exactly like the old workflow. */
    public ChatResponse text(String sessionId, String lang, String message) {
        String l = normLang(lang);
        ShlokaParser.Parsed answer = answer(sessionId, l, message);
        return new ChatResponse(message, answer.reply(), answer.shloka(), null, null, "text");
    }

    /** Spoken message: transcribe, answer, then speak the answer back. */
    public ChatResponse voice(String sessionId, String lang, byte[] audio, String mimeType) {
        String l = normLang(lang);
        String transcript = gemini.transcribe(audio, mimeType, l);

        // Nothing heard: the app removes the bubbles and shows "no voice detected".
        if (transcript.isBlank()) {
            return new ChatResponse("", "", null, null, null, "voice");
        }

        ShlokaParser.Parsed answer = answer(sessionId, l, transcript);

        String audioBase64 = null;
        try {
            audioBase64 = gemini.speak(answer.reply());
        } catch (Exception e) {
            // The app falls back to the phone's own voice when there is no audio.
            log.warn("Text-to-speech failed, replying with text only: {}", e.toString());
        }
        return new ChatResponse(transcript, answer.reply(), answer.shloka(), audioBase64,
                audioBase64 == null ? null : "wav", "voice");
    }

    private ShlokaParser.Parsed answer(String sessionId, String lang, String userText) {
        String raw = gemini.chat(memory.history(sessionId), userText, lang);
        ShlokaParser.Parsed parsed = ShlokaParser.parse(raw);
        if (!parsed.reply().isBlank()) {
            memory.remember(sessionId, userText, parsed.reply());
        }
        return parsed;
    }

    private static String normLang(String lang) {
        return "en".equalsIgnoreCase(lang) ? "en" : "hi";
    }
}
