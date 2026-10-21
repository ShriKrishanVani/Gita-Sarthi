package com.krishnavani.gita;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Remembers the last few messages of each session (replaces the n8n "Simple Memory" node).
 * Kept in RAM: it is cleared when the server restarts, which is fine for a chat companion.
 */
@Component
public class ChatMemory {

    public record Turn(String role, String text) {}   // role = "user" or "model"

    private static final class Session {
        final List<Turn> turns = new ArrayList<>();
        volatile Instant lastUsed = Instant.now();
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final AppProperties props;

    public ChatMemory(AppProperties props) {
        this.props = props;
    }

    public List<Turn> history(String sessionId) {
        Session s = sessions.get(key(sessionId));
        if (s == null) return List.of();
        synchronized (s) {
            s.lastUsed = Instant.now();
            return List.copyOf(s.turns);
        }
    }

    public void remember(String sessionId, String userText, String modelText) {
        if (sessions.size() >= props.memory().maxSessions()) cleanup();
        if (sessions.size() >= props.memory().maxSessions()) return; // still full: skip memory, never crash

        Session s = sessions.computeIfAbsent(key(sessionId), k -> new Session());
        synchronized (s) {
            s.turns.add(new Turn("user", userText));
            s.turns.add(new Turn("model", modelText));
            while (s.turns.size() > props.memory().maxMessages()) s.turns.remove(0);
            s.lastUsed = Instant.now();
        }
    }

    @Scheduled(fixedDelay = 10 * 60 * 1000L)
    public void cleanup() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(props.memory().ttlMinutes()));
        sessions.entrySet().removeIf(e -> e.getValue().lastUsed.isBefore(cutoff));
    }

    private static String key(String sessionId) {
        return (sessionId == null || sessionId.isBlank()) ? "default-session" : sessionId;
    }
}
