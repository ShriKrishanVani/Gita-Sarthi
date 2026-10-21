package com.krishnavani.gita;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * The app has no login, so anyone who finds the URL could burn your Gemini quota.
 * This allows each visitor IP a limited number of chat calls per minute.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)   // after CORS, before the controller
public class RateLimitFilter extends OncePerRequestFilter {

    private static final class Window {
        final long minute;
        final AtomicInteger count = new AtomicInteger();
        Window(long minute) { this.minute = minute; }
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int limit;

    public RateLimitFilter(AppProperties props) {
        this.limit = props.rateLimitPerMinute();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        long minute = System.currentTimeMillis() / 60_000L;
        Window w = windows.compute(req.getRemoteAddr(),
                (ip, old) -> (old == null || old.minute != minute) ? new Window(minute) : old);

        if (w.count.incrementAndGet() > limit) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.setCharacterEncoding(StandardCharsets.UTF_8.name());
            res.getWriter().write("{\"error\":\"Too many messages. Please wait a minute and try again.\"}");
            return;
        }
        chain.doFilter(req, res);
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void cleanup() {
        long minute = System.currentTimeMillis() / 60_000L;
        windows.entrySet().removeIf(e -> e.getValue().minute < minute);
    }
}
