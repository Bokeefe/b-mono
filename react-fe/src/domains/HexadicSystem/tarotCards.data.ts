export interface TarotCard {
  name: string;
  description: string;
  emoji: string;
  element?: "water" | "earth" | "fire" | "air";
}

export const tarotCards: TarotCard[] = [
  // Major Arcana (0-21)
  {
    name: "The Fool",
    description: "New beginnings, innocence, spontaneity, a free spirit",
    emoji: "🃏",
  },
  {
    name: "The Magician",
    description: "Manifestation, resourcefulness, power, inspired action",
    emoji: "🎩",
  },
  {
    name: "The High Priestess",
    description: "Intuition, sacred knowledge, divine feminine, the subconscious mind",
    emoji: "🌙",
  },
  {
    name: "The Empress",
    description: "Femininity, beauty, nature, nurturing, abundance",
    emoji: "👑",
  },
  {
    name: "The Emperor",
    description: "Authority, establishment, structure, a father figure",
    emoji: "⚔️",
  },
  {
    name: "The Hierophant",
    description: "Spiritual wisdom, religious beliefs, conformity, tradition, conventional values",
    emoji: "⛪",
  },
  {
    name: "The Lovers",
    description: "Love, harmony, relationships, values alignment, choices",
    emoji: "💑",
  },
  {
    name: "The Chariot",
    description: "Control, willpower, success, action, determination",
    emoji: "🏎️",
  },
  {
    name: "Strength",
    description: "Strength, courage, persuasion, influence, compassion",
    emoji: "💪",
  },
  {
    name: "The Hermit",
    description: "Soul searching, introspection, being alone, inner guidance",
    emoji: "🕯️",
  },
  {
    name: "Wheel of Fortune",
    description: "Good luck, karma, life cycles, destiny, a turning point",
    emoji: "🎡",
  },
  {
    name: "Justice",
    description: "Justice, fairness, truth, cause and effect, law",
    emoji: "⚖️",
  },
  {
    name: "The Hanged Man",
    description: "Pause, surrender, letting go, new perspectives",
    emoji: "🙃",
  },
  {
    name: "Death",
    description: "Endings, change, transformation, transition",
    emoji: "💀",
  },
  {
    name: "Temperance",
    description: "Balance, moderation, patience, purpose",
    emoji: "🍷",
  },
  {
    name: "The Devil",
    description: "Shadow self, attachment, addiction, restriction, sexuality",
    emoji: "😈",
  },
  {
    name: "The Tower",
    description: "Sudden change, upheaval, chaos, revelation, awakening",
    emoji: "🗼",
  },
  {
    name: "The Star",
    description: "Hope, faith, purpose, renewal, spirituality",
    emoji: "⭐",
  },
  {
    name: "The Moon",
    description: "Illusion, fear, anxiety, subconscious, intuition",
    emoji: "🌙",
  },
  {
    name: "The Sun",
    description: "Positivity, fun, warmth, success, vitality",
    emoji: "☀️",
  },
  {
    name: "Judgement",
    description: "Judgement, rebirth, inner calling, absolution",
    emoji: "📯",
  },
  {
    name: "The World",
    description: "Completion, accomplishment, travel, achievement, fulfillment",
    emoji: "🌍",
  },
  
  // Minor Arcana - Cups
  {
    name: "Ace of Cups",
    description: "New feelings, spirituality, intuition, intimacy, open heart",
    emoji: "🫖",
    element: "water",
  },
  {
    name: "Two of Cups",
    description: "Unified love, partnership, mutual attraction, connection",
    emoji: "💕",
    element: "water",
  },
  {
    name: "Three of Cups",
    description: "Friendship, community, gatherings, celebrations",
    emoji: "🥂",
    element: "water",
  },
  {
    name: "Four of Cups",
    description: "Meditation, contemplation, apathy, reevaluation",
    emoji: "🧘",
    element: "water",
  },
  {
    name: "Five of Cups",
    description: "Loss, grief, self-pity, regret, disappointment",
    emoji: "😢",
    element: "water",
  },
  {
    name: "Six of Cups",
    description: "Revisiting the past, childhood memories, innocence, joy",
    emoji: "🎈",
    element: "water",
  },
  {
    name: "Seven of Cups",
    description: "Searching for purpose, choices, daydreaming, illusion",
    emoji: "🌈",
    element: "water",
  },
  {
    name: "Eight of Cups",
    description: "Walking away, disillusionment, leaving behind, searching for truth",
    emoji: "🚶",
    element: "water",
  },
  {
    name: "Nine of Cups",
    description: "Contentment, satisfaction, gratitude, wish come true",
    emoji: "😊",
    element: "water",
  },
  {
    name: "Ten of Cups",
    description: "Divine love, alignment, harmony, blessings, blissful relationships",
    emoji: "🏡",
    element: "water",
  },
  {
    name: "Page of Cups",
    description: "Creative opportunities, intuitive messages, curiosity, possibility",
    emoji: "🐠",
    element: "water",
  },
  {
    name: "Knight of Cups",
    description: "Following the heart, idealist, romantic, charming, emotional",
    emoji: "🦄",
    element: "water",
  },
  {
    name: "Queen of Cups",
    description: "Compassionate, caring, emotionally stable, intuitive, in flow",
    emoji: "🧜‍♀️",
    element: "water",
  },
  {
    name: "King of Cups",
    description: "Emotional balance, compassion, diplomacy, control of feelings",
    emoji: "🧜‍♂️",
    element: "water",
  },
  
  // Minor Arcana - Wands
  {
    name: "Ace of Wands",
    description: "Creation, willpower, inspiration, desire, new beginnings",
    emoji: "🔥",
    element: "fire",
  },
  {
    name: "Two of Wands",
    description: "Planning, making decisions, leaving comfort, discovery",
    emoji: "🗺️",
    element: "fire",
  },
  {
    name: "Three of Wands",
    description: "Looking ahead, expansion, rapid growth, foresight",
    emoji: "🔭",
    element: "fire",
  },
  {
    name: "Four of Wands",
    description: "Community, home, celebration, harmony, belonging",
    emoji: "🎉",
    element: "fire",
  },
  {
    name: "Five of Wands",
    description: "Disagreement, competition, conflict, tension, diversity",
    emoji: "⚔️",
    element: "fire",
  },
  {
    name: "Six of Wands",
    description: "Success, public recognition, progress, self-confidence",
    emoji: "🏆",
    element: "fire",
  },
  {
    name: "Seven of Wands",
    description: "Protecting, standing up for beliefs, maintaining control, defensiveness",
    emoji: "🛡️",
    element: "fire",
  },
  {
    name: "Eight of Wands",
    description: "Rapid action, movement, quick decisions, sudden changes",
    emoji: "⚡",
    element: "fire",
  },
  {
    name: "Nine of Wands",
    description: "Resilience, grit, last stand, persistence, test of faith",
    emoji: "🪨",
    element: "fire",
  },
  {
    name: "Ten of Wands",
    description: "Burden, responsibility, hard work, achievement, stress",
    emoji: "📦",
    element: "fire",
  },
  {
    name: "Page of Wands",
    description: "Exploration, excitement, freedom, being carefree, inspiration",
    emoji: "🦋",
    element: "fire",
  },
  {
    name: "Knight of Wands",
    description: "Action, adventure, fearlessness, energy, passion",
    emoji: "🐎",
    element: "fire",
  },
  {
    name: "Queen of Wands",
    description: "Courage, determination, joy, independence, confidence",
    emoji: "🦁",
    element: "fire",
  },
  {
    name: "King of Wands",
    description: "Natural-born leader, vision, entrepreneur, honor, big picture",
    emoji: "👑",
    element: "fire",
  },
  
  // Minor Arcana - Swords
  {
    name: "Ace of Swords",
    description: "Breakthrough, clarity, sharp mind, concentration, truth",
    emoji: "🗡️",
    element: "air",
  },
  {
    name: "Two of Swords",
    description: "Difficult choices, indecision, being stuck, stalemate",
    emoji: "⚖️",
    element: "air",
  },
  {
    name: "Three of Swords",
    description: "Heartbreak, emotional pain, sorrow, grief, hurt",
    emoji: "💔",
    element: "air",
  },
  {
    name: "Four of Swords",
    description: "Rest, restoration, contemplation, recuperation, meditation",
    emoji: "🧘‍♂️",
    element: "air",
  },
  {
    name: "Five of Swords",
    description: "Unbridled ambition, win at all costs, sneakiness, dishonor",
    emoji: "🗯️",
    element: "air",
  },
  {
    name: "Six of Swords",
    description: "Transition, leaving behind, moving on, accepting help",
    emoji: "⛵",
    element: "air",
  },
  {
    name: "Seven of Swords",
    description: "Deception, trickery, tactics and strategy, lies, betrayal",
    emoji: "🥷",
    element: "air",
  },
  {
    name: "Eight of Swords",
    description: "Imprisonment, entrapment, self-victimization, hopelessness",
    emoji: "🔒",
    element: "air",
  },
  {
    name: "Nine of Swords",
    description: "Anxiety, worry, fear, depression, nightmares",
    emoji: "😰",
    element: "air",
  },
  {
    name: "Ten of Swords",
    description: "Betrayal, back-stabbing, endings, loss, crisis",
    emoji: "⚰️",
    element: "air",
  },
  {
    name: "Page of Swords",
    description: "New ideas, curiosity, thirst for knowledge, new ways of communicating",
    emoji: "📚",
    element: "air",
  },
  {
    name: "Knight of Swords",
    description: "Action, impulsiveness, defending beliefs, fighting for justice",
    emoji: "⚔️",
    element: "air",
  },
  {
    name: "Queen of Swords",
    description: "Clear boundaries, direct communication, independence, honesty",
    emoji: "👸",
    element: "air",
  },
  {
    name: "King of Swords",
    description: "Mental clarity, intellectual power, authority, truth",
    emoji: "🧠",
    element: "air",
  },
  
  // Minor Arcana - Pentacles
  {
    name: "Ace of Pentacles",
    description: "New opportunity, resources, abundance, new financial beginning",
    emoji: "💰",
    element: "earth",
  },
  {
    name: "Two of Pentacles",
    description: "Priorities, time management, planning, resourcefulness",
    emoji: "🎪",
    element: "earth",
  },
  {
    name: "Three of Pentacles",
    description: "Teamwork, collaboration, learning, implementation",
    emoji: "🏗️",
    element: "earth",
  },
  {
    name: "Four of Pentacles",
    description: "Control, stability, security, possession, conservatism",
    emoji: "🏛️",
    element: "earth",
  },
  {
    name: "Five of Pentacles",
    description: "Need, poverty, insecurity, hardship, alienation",
    emoji: "🏥",
    element: "earth",
  },
  {
    name: "Six of Pentacles",
    description: "Generosity, charity, giving, prosperity, sharing wealth",
    emoji: "🤲",
    element: "earth",
  },
  {
    name: "Seven of Pentacles",
    description: "Hard work, perseverance, patience, long-term view",
    emoji: "🌱",
    element: "earth",
  },
  {
    name: "Eight of Pentacles",
    description: "Skill, talent, quality, high standards, mastery",
    emoji: "🔨",
    element: "earth",
  },
  {
    name: "Nine of Pentacles",
    description: "Fruits of labor, rewards, luxury, self-sufficiency, fulfillment",
    emoji: "🍇",
    element: "earth",
  },
  {
    name: "Ten of Pentacles",
    description: "Wealth, financial security, family, long-term success, contribution",
    emoji: "🏰",
    element: "earth",
  },
  {
    name: "Page of Pentacles",
    description: "Desire for manifestation, goal setting, new opportunity, new job",
    emoji: "🌱",
    element: "earth",
  },
  {
    name: "Knight of Pentacles",
    description: "Efficiency, routine, conservatism, working hard, responsibility",
    emoji: "🐂",
    element: "earth",
  },
  {
    name: "Queen of Pentacles",
    description: "Practicality, creature comforts, financial security, nurturing",
    emoji: "🌿",
    element: "earth",
  },
  {
    name: "King of Pentacles",
    description: "Security, control, power, discipline, abundance",
    emoji: "💎",
    element: "earth",
  },
];
