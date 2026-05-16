export interface MockEvent {
  id: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  time?: string;
  type?: "run" | "cycling" | "strength" | "rest" | "other";
  description?: string;
  source?: "Germini" | "Strava" | "Sidekick";
}

export const germiniMockEvents: MockEvent[] = [
  {
    id: "1",
    date: "2026-05-16",
    time: "07:30",
    title: "Longão de fim de semana",
    type: "run",
    description: "Corrida longa em ritmo confortável com foco na resistência.",
    source: "Strava",
  },
  {
    id: "2",
    date: "2026-05-17",
    time: "09:00",
    title: "Bike com amigos",
    type: "cycling",
    description: "Passeio em grupo com subidas leves e belas paisagens.",
    source: "Strava",
  },
  {
    id: "3",
    date: "2026-05-18",
    time: "18:15",
    title: "Treino intervalado",
    type: "run",
    description: "Fartlek na pista com repetições de 400m.",
    source: "Germini",
  },
  {
    id: "4",
    date: "2026-05-20",
    time: "17:00",
    title: "Musculação de força",
    type: "strength",
    description: "Circuito de pernas e core com ênfase em potência.",
    source: "Sidekick",
  },
  {
    id: "5",
    date: "2026-05-21",
    time: "12:00",
    title: "Recuperação ativa",
    type: "rest",
    description: "Caminhada leve e alongamento para recuperação.",
    source: "Germini",
  },
];

export default germiniMockEvents;
