import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/contexts/AuthContext";
import { apiService } from "@/src/services/apiService";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

const STORAGE_KEY = "@sidekick:chat_history";

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const companionName = user?.profile?.companionName || "Sidekick";
  const companionAvatar = user?.profile?.companionAvatar || "🤖";

  const QUICK_QUESTIONS = [
    "O que é pace?",
    "Qual o recorde da maratona?",
    "Como evitar dores no joelho?",
    "O que comer antes do treino?",
    "Dicas para começar a correr",
    "Como melhorar meu fôlego?",
    "O que é treino de cadência?",
    "Qual a melhor frequência cardíaca?",
  ];

  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Shuffle suggestions when chat is empty or welcome state
  useEffect(() => {
    if (messages.length <= 1) {
      const shuffled = [...QUICK_QUESTIONS].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 3));
    } else {
      setSuggestions([]);
    }
  }, [messages]);

  // Load history on startup
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save history on changes
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMessages(JSON.parse(raw));
      } else {
        // Welcome message
        setMessages([
          {
            id: "welcome",
            sender: "bot",
            text: `Olá! Eu sou o seu companheiro ${companionName}. Como estão os seus treinos hoje? Estou pronto para te ajudar a manter a consistência! 🏃‍♂️🚲`,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }
  };

  const saveChatHistory = async (history: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  };

  const handleClearHistory = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: `Conversa reiniciada. Eu sou o ${companionName}! Como posso te ajudar agora?`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e) {
      console.warn("Failed to clear chat history", e);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    if (!customText) {
      setInputText("");
    }

    const userText = textToSend.trim();

    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Map history for Gemini API context
      const apiHistory = messages.slice(-6).map((m) => ({
        role: (m.sender === "user" ? "user" : "model") as "user" | "model",
        parts: m.text,
      }));

      const res = await apiService.post("/chat", {
        message: userText,
        history: apiHistory,
      });

      if (res && res.success && res.response) {
        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          sender: "bot",
          text: res.response,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error("Chat api failed");
      }
    } catch (error) {
      console.error("Chat response error:", error);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "bot",
        text: "Desculpe, tive um probleminha para me conectar. Pode tentar me mandar a mensagem novamente? 🥹",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.botWrapper]}>
        {!isUser && (
          <View style={styles.botAvatarContainer}>
            <Text style={styles.botAvatarEmoji}>{companionAvatar}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTime}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{companionName}</Text>
          <Text style={styles.headerSubtitle}>Seu Companheiro IA</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <Text style={styles.clearButtonText}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{companionName} está escrevendo...</Text>
          <ActivityIndicator size="small" color="#ff6b6b" style={{ marginLeft: 8 }} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.length <= 2 && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionPill}
                onPress={() => handleSend(q)}
              >
                <Text style={styles.suggestionPillText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Fale com seu Sidekick..."
            placeholderTextColor="#888"
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
            <Text style={styles.sendButtonText}>➔</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "500",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
  },
  clearButtonText: {
    color: "#b0b0b0",
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "80%",
  },
  userWrapper: {
    alignSelf: "flex-end",
  },
  botWrapper: {
    alignSelf: "flex-start",
  },
  botAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  botAvatarEmoji: {
    fontSize: 16,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#ff6b6b",
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: "#1c1c1e",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: "#888",
    fontSize: 12,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  input: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "#0a0a0a",
  },
  suggestionPill: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionPillText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "500",
  },
});
