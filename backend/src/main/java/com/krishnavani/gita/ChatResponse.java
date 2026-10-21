package com.krishnavani.gita;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Same JSON shape the app already expects from the old n8n "Respond to app" node:
 * transcript, reply, shloka{ref,sanskrit,meaning}, audioBase64, audioFormat, mode.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ChatResponse(
        String transcript,
        String reply,
        Shloka shloka,
        String audioBase64,
        String audioFormat,
        String mode) {

    public record Shloka(String ref, String sanskrit, String meaning) {}
}
