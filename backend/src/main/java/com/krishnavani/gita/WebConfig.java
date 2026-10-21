package com.krishnavani.gita;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class WebConfig {

    /**
     * CORS lets your GitHub Pages site call this backend from the browser.
     * Registered as a servlet filter that runs first, so even error replies
     * (like "too many requests") still carry the CORS headers.
     */
    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        List<String> origins = props.cors().allowedOrigins();
        cfg.setAllowedOriginPatterns(origins.isEmpty() ? List.of("*") : origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);

        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }
}
