package ie.michaelferry.tradingapi.auth.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Centralised RestTemplate bean configuration.
 * Provides a single, shared, Spring-managed RestTemplate instance
 * instead of each service class instantiating its own.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
