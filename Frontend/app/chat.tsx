import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from './components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
  const { isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Grab params passed from the History screen (if we are resuming a chat)
  const params = useLocalSearchParams();

  // ── Apple system colour palette ──
  const textColor    = isDark ? '#FFFFFF'                 : '#000000';
  const surfaceColor = isDark ? '#000000'                 : '#F2F2F7';
  const accentColor  = isDark ? '#0A84FF'                 : '#007AFF';
  const userBubbleBg = isDark ? '#0A84FF'                 : '#007AFF';
  const aiBubbleBg   = isDark ? '#1C1C1E'                 : '#FFFFFF';
  const borderColor  = isDark ? 'rgba(84,84,88,0.65)'     : 'rgba(60,60,67,0.18)';
  const inputBg      = isDark ? '#1C1C1E'                 : '#FFFFFF';
  const subText      = isDark ? '#8E8E93'                 : '#6D6D72';
  const codeBg       = isDark ? '#000000'                 : '#F2F2F7';

  // ── State (unchanged logic) ──
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [sessionId] = useState(
    (params.sessionId as string) || Date.now().toString()
  );

  const [messages, setMessages] = useState(() => {
    if (params.pastMessages) {
      try {
        return JSON.parse(params.pastMessages as string);
      } catch (e) {
        console.error('Failed to parse past messages', e);
      }
    }
    return [
      {
        id: '1',
        role: 'ai',
        text: 'Trace system active. Paste your error stack or code snippet below.',
      },
    ];
  });

  // ── Clipboard (unchanged logic) ──
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Response copied to clipboard.');
  };

  // ── Send message (unchanged logic) ──
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const tempId = Date.now().toString();
    const userMsg = { id: tempId, role: 'user', text: inputText.trim() };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const SERVER_URL = 'http://localhost:8080/api/debug';

      const response = await fetch(SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionId: sessionId, prompt: userMsg.text }),
      });

      if (!response.ok)
        throw new Error(`Server responded with status: ${response.status}`);

      const data = await response.json();
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: '`Error:` Could not connect to the Trace Go backend. Ensure your server is running.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Markdown styles ──
  const markdownStyles = {
    body: { color: textColor, fontSize: 15, lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: 8 },
    code_inline: {
      backgroundColor: codeBg,
      color: accentColor,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      overflow: 'hidden' as const,
      fontSize: 13,
    },
    fence: {
      backgroundColor: codeBg,
      borderColor: borderColor,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 10,
      padding: 12,
      marginVertical: 6,
    },
    code_block: {
      color: isDark ? '#E2E8F0' : '#1E293B',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
    },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: surfaceColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Large title (Apple navigation style) ── */}
      <Text style={[styles.title, { color: textColor }]}>Assistant</Text>

      {/* ── Message list ── */}
      <ScrollView
        style={styles.chatArea}
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const key = msg.id || index.toString();

          return (
            <View
              key={key}
              style={[
                styles.messageWrapper,
                isUser ? styles.messageWrapperUser : styles.messageWrapperAi,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                  {
                    backgroundColor: isUser ? userBubbleBg : aiBubbleBg,
                    borderColor: isUser ? 'transparent' : borderColor,
                    borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
                    // Subtle shadow only on AI bubbles
                    shadowColor: isUser ? 'transparent' : '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isUser ? 0 : isDark ? 0 : 0.05,
                    shadowRadius: 4,
                    elevation: isUser ? 0 : 1,
                  },
                ]}
              >
                {isUser ? (
                  <Text
                    selectable
                    style={styles.userText}
                  >
                    {msg.text}
                  </Text>
                ) : (
                  <Markdown style={markdownStyles}>{msg.text}</Markdown>
                )}
              </View>

              {/* Copy button under AI bubbles */}
              {!isUser && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(msg.text)}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="copy-outline"
                    size={12}
                    color={subText}
                  />
                  <Text style={[styles.copyText, { color: subText }]}>
                    Copy
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <View style={[styles.typingBubble, { backgroundColor: aiBubbleBg, borderColor: borderColor }]}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={[styles.typingText, { color: subText }]}>
              Analyzing…
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Input bar ── */}
      <View
        style={[
          styles.inputBar,
          { backgroundColor: inputBg, borderColor: borderColor },
        ]}
      >
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Paste code or error here…"
          placeholderTextColor={subText}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={3000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputText.trim()
                ? accentColor
                : isDark
                ? '#2C2C2E'
                : '#E5E5EA',
            },
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={
              inputText.trim() ? '#FFFFFF' : isDark ? '#48484A' : '#C7C7CC'
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },

  title: {
    fontSize: 34, fontWeight: '700', letterSpacing: -0.5,
    marginBottom: 16, paddingHorizontal: 20,
  },

  chatArea: { flex: 1, paddingHorizontal: 16 },

  messageWrapper: { marginBottom: 4, maxWidth: '78%' },
  messageWrapperUser: { alignSelf: 'flex-end', marginBottom: 12 },
  messageWrapperAi: { alignSelf: 'flex-start', marginBottom: 12 },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 5 },
  aiBubble: { borderBottomLeftRadius: 5 },

  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '400' },

  copyButton: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 5, marginLeft: 6,
  },
  copyText: { fontSize: 11, marginLeft: 3, fontWeight: '500' },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start', marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderBottomLeftRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  typingText: { fontSize: 14, fontWeight: '400' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginBottom: 116,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    flex: 1,
    maxHeight: 130,
    minHeight: 36,
    fontSize: 15,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 10,
    lineHeight: 22,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
});