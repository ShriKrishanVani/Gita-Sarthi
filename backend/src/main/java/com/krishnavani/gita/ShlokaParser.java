package com.krishnavani.gita;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The AI ends its answer with  [[SHLOKA]]{json}[[/SHLOKA]].
 * This splits the answer into the plain reply and the verse card.
 */
public final class ShlokaParser {

    private static final String OPEN = "[[SHLOKA]]";
    private static final String CLOSE = "[[/SHLOKA]]";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ShlokaParser() {}

    public record Parsed(String reply, ChatResponse.Shloka shloka) {}

    public static Parsed parse(String raw) {
        if (raw == null) return new Parsed("", null);
        int start = raw.indexOf(OPEN);
        if (start < 0) return new Parsed(raw.trim(), null);

        int end = raw.indexOf(CLOSE, start);
        String inner = raw.substring(start + OPEN.length(), end > -1 ? end : raw.length()).trim();
        String reply = (raw.substring(0, start) + (end > -1 ? raw.substring(end + CLOSE.length()) : "")).trim();

        ChatResponse.Shloka shloka = null;
        try {
            JsonNode o = MAPPER.readTree(inner);
            String sanskrit = o.path("sanskrit").asText("");
            if (!sanskrit.isBlank()) {
                shloka = new ChatResponse.Shloka(
                        blankToNull(o.path("ref").asText(null)),
                        sanskrit,
                        blankToNull(o.path("meaning").asText(null)));
            }
        } catch (Exception ignored) {
            // bad JSON from the model: just show the reply without a verse card
        }
        return new Parsed(reply, shloka);
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
