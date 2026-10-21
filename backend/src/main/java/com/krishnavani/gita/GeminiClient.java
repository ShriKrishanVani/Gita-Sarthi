package com.krishnavani.gita;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Talks to Google Gemini. Three jobs (the same three the n8n workflow did):
 *  1. chat()       - Shri Krishna's answer (the "AI Agent" node)
 *  2. transcribe() - speech to text           (the first "HTTP Request" node)
 *  3. speak()      - text to speech, as WAV   (the "HTTP Request1" + "Code in JavaScript1" nodes)
 */
@Component
public class GeminiClient {

    private final AppProperties.Gemini cfg;
    private final RestClient http;
    private final String systemPromptTemplate;

    public GeminiClient(AppProperties props) {
        this.cfg = props.gemini();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(90).toMillis());

        this.http = RestClient.builder()
                .baseUrl(cfg.baseUrl())
                .requestFactory(factory)
                .build();

        try (var in = new ClassPathResource("system-prompt.txt").getInputStream()) {
            this.systemPromptTemplate = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read system-prompt.txt", e);
        }
    }

    // ---------------------------------------------------------------- chat

    public String chat(List<ChatMemory.Turn> history, String userText, String lang) {
        List<Object> contents = new ArrayList<>();
        for (ChatMemory.Turn t : history) {
            contents.add(map("role", t.role(), "parts", list(map("text", t.text()))));
        }
        contents.add(map("role", "user", "parts", list(map("text", userText))));

        Map<String, Object> body = map(
                "system_instruction", map("parts", list(map("text",
                        systemPromptTemplate.replace("{{LANG}}", lang)))),
                "contents", contents);

        return firstText(generate(cfg.chatModel(), body));
    }

    // ------------------------------------------------------ speech to text

    public String transcribe(byte[] audio, String mimeType, String lang) {
        String language = "en".equals(lang) ? "English" : "Hindi";
        String instruction = "The user selected the language: " + language
                + ". Transcribe this audio exactly in that language and script. "
                + "Hindi must be written in Devanagari script, not Romanized Hindi. "
                + "Do not translate or transliterate. "
                + "Output ONLY the transcript text, nothing else.";

        Map<String, Object> audioPart = map("inline_data", map(
                "mime_type", mimeType,
                "data", Base64.getEncoder().encodeToString(audio)));
        Map<String, Object> textPart = map("text", instruction);

        Map<String, Object> body = map("contents", list(map(
                "role", "user",
                "parts", list(audioPart, textPart))));

        return firstText(generate(cfg.sttModel(), body)).trim();
    }

    // ------------------------------------------------------ text to speech

    /** Returns a WAV file as base64, which is what the app's audio player expects. */
    public String speak(String text) {
        Map<String, Object> body = map(
                "contents", list(map("parts", list(map("text", text)))),
                "generationConfig", map(
                        "responseModalities", list("AUDIO"),
                        "speechConfig", map("voiceConfig", map(
                                "prebuiltVoiceConfig", map("voiceName", cfg.ttsVoice())))));

        JsonNode res = generate(cfg.ttsModel(), body);
        String pcmBase64 = res.path("candidates").path(0).path("content").path("parts").path(0)
                .path("inlineData").path("data").asText("");
        if (pcmBase64.isEmpty()) throw new IllegalStateException("Gemini returned no audio");

        byte[] wav = pcmToWav(Base64.getDecoder().decode(pcmBase64), 24000, 1, 16);
        return Base64.getEncoder().encodeToString(wav);
    }

    // ------------------------------------------------------------- helpers

    private JsonNode generate(String model, Map<String, Object> body) {
        if (cfg.apiKey() == null || cfg.apiKey().isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is not set on the server");
        }
        return http.post()
                .uri("/models/{model}:generateContent", model)
                .header("x-goog-api-key", cfg.apiKey())   // header, so the key never shows up in URLs/logs
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    /** Builds a JSON object: map("a", 1, "b", 2). Avoids generic-inference trouble with Map.of. */
    private static Map<String, Object> map(Object... keysAndValues) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            m.put((String) keysAndValues[i], keysAndValues[i + 1]);
        }
        return m;
    }

    /** Builds a JSON array. */
    private static List<Object> list(Object... items) {
        return new ArrayList<>(List.of(items));
    }

    private static String firstText(JsonNode res) {
        StringBuilder sb = new StringBuilder();
        for (JsonNode part : res.path("candidates").path(0).path("content").path("parts")) {
            sb.append(part.path("text").asText(""));
        }
        return sb.toString();
    }

    static byte[] pcmToWav(byte[] pcm, int sampleRate, int channels, int bitsPerSample) {
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        int blockAlign = channels * bitsPerSample / 8;
        ByteBuffer buf = ByteBuffer.allocate(44 + pcm.length).order(ByteOrder.LITTLE_ENDIAN);
        buf.put("RIFF".getBytes(StandardCharsets.US_ASCII));
        buf.putInt(36 + pcm.length);
        buf.put("WAVE".getBytes(StandardCharsets.US_ASCII));
        buf.put("fmt ".getBytes(StandardCharsets.US_ASCII));
        buf.putInt(16);
        buf.putShort((short) 1);                 // PCM
        buf.putShort((short) channels);
        buf.putInt(sampleRate);
        buf.putInt(byteRate);
        buf.putShort((short) blockAlign);
        buf.putShort((short) bitsPerSample);
        buf.put("data".getBytes(StandardCharsets.US_ASCII));
        buf.putInt(pcm.length);
        buf.put(pcm);
        return buf.array();
    }
}
