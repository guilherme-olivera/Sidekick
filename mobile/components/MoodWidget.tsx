import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
};

const MOOD_OPTIONS = [
  { id: "tired", label: "Cansado", emoji: "🫩" },
  { id: "sick", label: "Doente", emoji: "🤢" },
  { id: "normal", label: "Normal", emoji: "😐" },
  { id: "angry", label: "Raiva", emoji: "😡" },
  { id: "sad", label: "Triste", emoji: "🥺" },
  { id: "happy", label: "Feliz", emoji: "🤣" },
];

interface MoodWidgetProps {
  onMoodSelect: (moodId: string, emoji: string) => void;
  currentMood?: string;
  currentMoodEmoji?: string;
}

export function MoodWidget({
  onMoodSelect,
  currentMood,
  currentMoodEmoji = "😐",
}: MoodWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMoodSelect = (moodId: string, emoji: string) => {
    onMoodSelect(moodId, emoji);
    setShowMenu(false);
  };

  return (
    <>
      {/* Mood Icon (bottom right) */}
      <TouchableOpacity
        style={styles.moodButton}
        onPress={() => setShowMenu(true)}
      >
        <Text style={styles.moodEmoji}>{currentMoodEmoji}</Text>
      </TouchableOpacity>

      {/* Mood Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Como você se sente?</Text>

            {/* Mood Options Grid */}
            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodOption,
                    currentMood === mood.id && styles.moodOptionActive,
                  ]}
                  onPress={() => handleMoodSelect(mood.id, mood.emoji)}
                >
                  <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodOptionLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  moodButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: Colors.darkBorder,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  moodEmoji: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  moodOption: {
    width: "32%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.dark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  moodOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.darkCard,
  },
  moodOptionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodOptionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  closeButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
