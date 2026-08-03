import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  gold: "#ffd700",
};

interface Slide {
  id: number;
  emoji: string;
  title: string;
  description: string;
  highlightColor: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    emoji: "🧠",
    title: "Seu Companheiro Digital",
    description: "O Sidekick analisa seus treinos, dá conselhos de evolução e te acompanha na corrida com a personalidade e humor que você mesmo escolhe.",
    highlightColor: Colors.primary,
  },
  {
    id: 2,
    emoji: "👟",
    title: "Integração Inteligente",
    description: "Sincronize com o Strava para importar suas corridas, pedaladas ou musculação. A IA analisa seu ritmo, volume e dores de forma contínua.",
    highlightColor: Colors.success,
  },
  {
    id: 3,
    emoji: "🏆",
    title: "Evolução Gamificada",
    description: "Acompanhe suas estatísticas, bata suas metas personalizadas e desbloqueie novas conquistas baseadas no seu esforço real.",
    highlightColor: Colors.gold,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleNext = () => {
    if (currentSlideIndex < SLIDES.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    router.replace("/onboarding");
  };

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button at the top */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Content */}
      <View style={styles.slideContainer}>
        <View 
          style={[
            styles.emojiContainer, 
            { borderColor: currentSlide.highlightColor + "33" }
          ]}
        >
          <Text style={styles.emoji}>{currentSlide.emoji}</Text>
        </View>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlideIndex 
                  ? [styles.activeDot, { backgroundColor: currentSlide.highlightColor }] 
                  : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentSlide.highlightColor }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentSlideIndex === SLIDES.length - 1
              ? "Iniciar Configuração"
              : "Próximo"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 12 : 24,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  slideContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 20 : 32,
    alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: Colors.darkBorder,
  },
  button: {
    width: width - 48,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "700",
  },
});
