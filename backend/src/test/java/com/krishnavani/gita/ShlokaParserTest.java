package com.krishnavani.gita;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ShlokaParserTest {

    @Test
    void splitsReplyAndVerse() {
        String raw = "प्रिय मित्र, कर्म करो।\n[[SHLOKA]]{\"ref\": \"2.47\", \"sanskrit\": \"कर्मण्येवाधिकारस्ते\", \"meaning\": \"कर्म पर तुम्हारा अधिकार है\"}[[/SHLOKA]]";
        var p = ShlokaParser.parse(raw);
        assertEquals("प्रिय मित्र, कर्म करो।", p.reply());
        assertNotNull(p.shloka());
        assertEquals("2.47", p.shloka().ref());
        assertEquals("कर्मण्येवाधिकारस्ते", p.shloka().sanskrit());
    }

    @Test
    void replyWithoutVerse() {
        var p = ShlokaParser.parse("नमस्ते, आपके मन में क्या है?");
        assertEquals("नमस्ते, आपके मन में क्या है?", p.reply());
        assertNull(p.shloka());
    }

    @Test
    void brokenJsonKeepsReplyDropsVerse() {
        var p = ShlokaParser.parse("Hello friend.\n[[SHLOKA]]{not json[[/SHLOKA]]");
        assertEquals("Hello friend.", p.reply());
        assertNull(p.shloka());
    }

    @Test
    void wavHeaderIsCorrect() {
        byte[] wav = GeminiClient.pcmToWav(new byte[100], 24000, 1, 16);
        assertEquals(144, wav.length);
        assertEquals("RIFF", new String(wav, 0, 4));
        assertEquals("WAVE", new String(wav, 8, 4));
    }
}
