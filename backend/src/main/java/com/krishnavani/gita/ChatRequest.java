package com.krishnavani.gita;

/** JSON body sent by the app for a typed message. Extra fields (deviceId, phone) are ignored. */
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public record ChatRequest(String message, String sessionId, String lang) {}
