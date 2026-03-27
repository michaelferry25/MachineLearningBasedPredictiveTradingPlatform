package ie.michaelferry.tradingapi.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import ie.michaelferry.tradingapi.auth.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    @Value("${security.jwt.secret}")
    private String jwtSecret;

    @Value("${security.jwt.expiration-minutes:60}")
    private long expirationMinutes;

    @Value("${security.jwt.issuer:marketmind}")
    private String issuer;

    public String generateToken(UserAccount user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expirationMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(user.getEmail())
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .claim("uid", user.getId())
                .claim("role", user.getRole().name())
                .claim("displayName", user.getDisplayName())
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public long getExpirationSeconds() {
        return expirationMinutes * 60;
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Derives the HMAC-SHA signing key from the configured secret.
     * Accepts either a Base64-encoded secret or a raw string (minimum 32 chars).
     * No weak null-byte padding — if the key is too short, we Base64-encode it
     * first so it always meets the 256-bit minimum for HS256.
     */
    private SecretKey getSigningKey() {
        try {
            // First, try standard Base64 decoding
            byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
            if (keyBytes.length >= 32) {
                return Keys.hmacShaKeyFor(keyBytes);
            }
        } catch (Exception ignored) {
            // Not valid Base64, fall through to raw string handling
        }

        // Raw string handling: encode to Base64 first to guarantee >= 32 bytes
        byte[] rawBytes = jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (rawBytes.length >= 32) {
            return Keys.hmacShaKeyFor(rawBytes);
        }

        // If secret is too short, Base64-encode it to extend safely (no null padding)
        String extended = Base64.getEncoder().encodeToString(rawBytes);
        byte[] extendedBytes = extended.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(extendedBytes.length >= 32
                ? extendedBytes
                : Keys.secretKeyFor(SignatureAlgorithm.HS256).getEncoded());
    }
}
