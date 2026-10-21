package com.krishnavani.gita;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatService chat;
    private final AppProperties props;

    public ChatController(ChatService chat, AppProperties props) {
        this.chat = chat;
        this.props = props;
    }

    /** Health check (Render pings this, and you can open it in a browser). */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "app", "Gita Sarthi backend");
    }

    /** Typed message. Body: { message, sessionId, lang } */
    @PostMapping(path = "/api/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> chatText(@RequestBody ChatRequest req) {
        String message = req.message() == null ? "" : req.message().trim();
        if (message.isEmpty()) return bad("message is empty");
        if (message.length() > props.maxMessageLength()) return bad("message is too long");

        return respond(() -> chat.text(req.sessionId(), req.lang(), message));
    }

    /** Spoken message. Multipart form: data (audio file), sessionId, lang */
    @PostMapping(path = "/api/chat", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> chatVoice(@RequestParam("data") MultipartFile data,
                                       @RequestParam(value = "sessionId", required = false) String sessionId,
                                       @RequestParam(value = "lang", defaultValue = "hi") String lang)
            throws IOException {
        if (data.isEmpty()) return bad("audio is empty");

        String mime = data.getContentType();
        if (mime == null || mime.isBlank() || "application/octet-stream".equals(mime)) mime = "audio/wav";
        final String audioMime = mime;
        final byte[] bytes = data.getBytes();

        return respond(() -> chat.voice(sessionId, lang, bytes, audioMime));
    }

    // ------------------------------------------------------------------

    private ResponseEntity<?> respond(java.util.function.Supplier<ChatResponse> work) {
        try {
            return ResponseEntity.ok(work.get());
        } catch (IllegalStateException e) {               // e.g. API key missing
            log.error("Configuration problem: {}", e.getMessage());
            return error(HttpStatus.SERVICE_UNAVAILABLE, "Server is not configured yet");
        } catch (RestClientException e) {                  // Gemini failed or timed out
            log.error("Gemini call failed: {}", e.toString());
            return error(HttpStatus.BAD_GATEWAY, "The AI service is not responding. Please try again.");
        } catch (Exception e) {
            log.error("Unexpected error", e);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
        }
    }

    private static ResponseEntity<?> bad(String msg) {
        return error(HttpStatus.BAD_REQUEST, msg);
    }

    private static ResponseEntity<?> error(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(Map.of("error", msg));
    }
}
