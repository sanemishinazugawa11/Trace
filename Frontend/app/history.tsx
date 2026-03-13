import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from './components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';

type Message = { role: 'user' | 'ai'; text: string };
type Session = {
  id: string;
  title: string;
  timestamp: string;
  status: 'error' | 'success';
  messages: Message[];
};

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  // ── Apple system colour palette ──
  const textColor    = isDark ? '#FFFFFF'               : '#000000';
  const subText      = isDark ? '#8E8E93'               : '#6D6D72';
  const surfaceColor = isDark ? '#000000'               : '#F2F2F7';
  const cardColor    = isDark ? '#1C1C1E'               : '#FFFFFF';
  const borderColor  = isDark ? 'rgba(84,84,88,0.65)'   : 'rgba(60,60,67,0.18)';
  const accentColor  = isDark ? '#0A84FF'               : '#007AFF';
  const userBubbleBg = isDark ? '#0A84FF'               : '#007AFF';

  // ── State (unchanged logic) ──
  const [logs, setLogs] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/history');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setLogs(data.sessions || []);
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const resumeChat = () => {
    if (!selectedSession) return;
    router.push({
      pathname: '/chat',
      params: {
        sessionId: selectedSession.id,
        pastMessages: JSON.stringify(selectedSession.messages),
      },
    });
  };

  // ── DETAIL VIEW ──
  if (selectedSession) {
    return (
      <View style={[styles.container, { backgroundColor: surfaceColor }]}>

        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={() => setSelectedSession(null)}
            style={[styles.backBtn, { backgroundColor: cardColor }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={accentColor} />
          </TouchableOpacity>
          <Text
            style={[styles.detailTitle, { color: textColor }]}
            numberOfLines={1}
          >
            {selectedSession.title}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          {selectedSession.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <View
                key={index}
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                  {
                    backgroundColor: isUser ? userBubbleBg : cardColor,
                    borderColor: isUser ? 'transparent' : borderColor,
                    borderWidth: isUser ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {isUser ? (
                  <Text style={styles.userBubbleText}>{msg.text}</Text>
                ) : (
                  <Markdown
                    style={{ body: { color: textColor, fontSize: 15, lineHeight: 22 } }}
                  >
                    {msg.text}
                  </Markdown>
                )}
              </View>
            );
          })}

          {/* Spacer above the resume button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Resume button */}
        <View style={[styles.resumeWrapper, { backgroundColor: surfaceColor }]}>
          <TouchableOpacity
            style={[styles.resumeButton, { backgroundColor: accentColor }]}
            onPress={resumeChat}
            activeOpacity={0.84}
          >
            <Ionicons
              name="chatbubbles"
              size={18}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.resumeText}>Resume This Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── LIST VIEW ──
  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>

      {/* Large title */}
      <Text style={[styles.title, { color: textColor }]}>Logs</Text>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={accentColor}
          style={{ marginTop: 60 }}
        />
      ) : logs.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconWrap,
              { backgroundColor: cardColor },
            ]}
          >
            <Ionicons
              name="folder-open-outline"
              size={36}
              color={subText}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            No History Yet
          </Text>
          <Text style={[styles.emptySubText, { color: subText }]}>
            Your debugging sessions will appear here automatically.
          </Text>
        </View>
      ) : (
        /* Session list — iOS grouped card style */
        <ScrollView
          style={styles.listScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.listCard, { backgroundColor: cardColor }]}>
            {logs.map((log, idx) => {
              const isLast = idx === logs.length - 1;
              const isError = log.status === 'error';

              return (
                <TouchableOpacity
                  key={log.id}
                  style={[
                    styles.listRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: borderColor,
                    },
                  ]}
                  onPress={() => setSelectedSession(log)}
                  activeOpacity={0.6}
                >
                  {/* Status dot */}
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isError ? '#FF3B30' : '#34C759',
                      },
                    ]}
                  />

                  {/* Title + timestamp */}
                  <View style={styles.rowContent}>
                    <Text
                      style={[styles.rowTitle, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {log.title}
                    </Text>
                    <Text style={[styles.rowSub, { color: subText }]}>
                      {log.timestamp}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={isDark ? 'rgba(235,235,245,0.25)' : 'rgba(60,60,67,0.25)'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80 },

  // List view
  title: {
    fontSize: 34, fontWeight: '700', letterSpacing: -0.5,
    marginBottom: 20, paddingHorizontal: 20,
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 116,
  },
  listCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  statusDot: {
    width: 9, height: 9, borderRadius: 5,
    marginRight: 14,
  },
  rowContent: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2, letterSpacing: -0.2 },
  rowSub: { fontSize: 13 },

  // Empty state
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, marginTop: -60,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8, letterSpacing: -0.4 },
  emptySubText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },

  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  detailTitle: { fontSize: 17, fontWeight: '600', flex: 1, letterSpacing: -0.3 },
  detailScroll: { flex: 1, paddingHorizontal: 16 },

  bubble: { padding: 14, borderRadius: 20, maxWidth: '78%', marginBottom: 14 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  userBubbleText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },

  // Resume
  resumeWrapper: {
    paddingHorizontal: 20, paddingBottom: 116, paddingTop: 12,
  },
  resumeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, borderRadius: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12,
    elevation: 4,
  },
  resumeText: { color: '#FFF', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
});