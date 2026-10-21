package com.krishnavani.gita;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** All settings come from application.properties / environment variables. */
@ConfigurationProperties(prefix = "gita")
public record AppProperties(
        Gemini gemini,
        Cors cors,
        int rateLimitPerMinute,
        int maxMessageLength,
        Memory memory) {

    public record Gemini(String apiKey, String baseUrl, String chatModel,
                         String sttModel, String ttsModel, String ttsVoice) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Memory(int maxMessages, int ttlMinutes, int maxSessions) {}
}
