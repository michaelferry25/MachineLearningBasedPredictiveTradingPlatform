package ie.michaelferry.tradingapi.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple IP-based rate limiter using a sliding window approach.
 * Limits each IP to a configurable number of requests per minute.
 * Returns HTTP 429 (Too Many Requests) when the limit is exceeded.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int MAX_REQUESTS_PER_MINUTE = 100;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Skip rate limiting for OPTIONS pre-flight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String clientIp = getClientIp(request);
        RequestCounter counter = requestCounts.compute(clientIp, (key, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStart > WINDOW_MS) {
                return new RequestCounter(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > MAX_REQUESTS_PER_MINUTE) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Rate limit exceeded. Please wait before retrying.\",\"retryAfterMs\":" + WINDOW_MS + "}");
            return false;
        }

        // Periodic cleanup of stale entries (every ~500 requests)
        if (requestCounts.size() > 500) {
            long now = System.currentTimeMillis();
            requestCounts.entrySet().removeIf(e -> now - e.getValue().windowStart > WINDOW_MS * 2);
        }

        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private static class RequestCounter {
        final long windowStart;
        final AtomicInteger count;

        RequestCounter(long windowStart) {
            this.windowStart = windowStart;
            this.count = new AtomicInteger(1);
        }
    }
}
