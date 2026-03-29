package ie.michaelferry.tradingapi.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the RateLimitInterceptor — verifying that it
 * throttles excessive requests and passes normal traffic.
 */
class RateLimitInterceptorTest {

    private RateLimitInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new RateLimitInterceptor();
    }

    @Test
    void shouldAllowNormalTraffic() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getMethod()).thenReturn("GET");
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");

        assertTrue(interceptor.preHandle(request, response, null));
    }

    @Test
    void shouldAlwaysAllowOptionsRequests() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getMethod()).thenReturn("OPTIONS");

        assertTrue(interceptor.preHandle(request, response, null));
    }

    @Test
    void shouldBlockAfterExceedingRateLimit() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);

        when(request.getMethod()).thenReturn("GET");
        when(request.getRemoteAddr()).thenReturn("10.0.0.99");
        when(response.getWriter()).thenReturn(pw);

        // Fire 101 requests from the same IP (limit is 100)
        for (int i = 0; i < 100; i++) {
            interceptor.preHandle(request, response, null);
        }

        boolean allowed = interceptor.preHandle(request, response, null);
        assertFalse(allowed, "Request 101 should be blocked by rate limiter");
        verify(response, atLeastOnce()).setStatus(429);
    }

    @Test
    void shouldTrackDifferentIpsSeparately() throws Exception {
        HttpServletRequest req1 = mock(HttpServletRequest.class);
        HttpServletRequest req2 = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(req1.getMethod()).thenReturn("GET");
        when(req1.getRemoteAddr()).thenReturn("1.1.1.1");
        when(req2.getMethod()).thenReturn("GET");
        when(req2.getRemoteAddr()).thenReturn("2.2.2.2");

        // 50 requests from each IP — both should pass
        for (int i = 0; i < 50; i++) {
            assertTrue(interceptor.preHandle(req1, response, null));
            assertTrue(interceptor.preHandle(req2, response, null));
        }
    }

    @Test
    void shouldRespectXForwardedForHeader() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        when(request.getMethod()).thenReturn("GET");
        when(request.getHeader("X-Forwarded-For")).thenReturn("8.8.8.8, 10.0.0.1");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");

        assertTrue(interceptor.preHandle(request, response, null));
        // The interceptor should use 8.8.8.8 (first XFF entry), not 127.0.0.1
    }
}
