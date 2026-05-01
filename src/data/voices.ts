import type { Voice } from '../types';

export const voices: Voice[] = [
  {
    id: 'onyx',
    voiceId: 'onyx',
    label: 'Onyx',
    description: 'Serious news broadcaster — low, steady, authoritative',
    gender: 'male',
    accent: 'American'
  },
  {
    id: 'fable',
    voiceId: 'fable',
    label: 'Fable',
    description: 'High-energy podcast host — rapid, dramatic, punchy',
    gender: 'male',
    accent: 'American'
  },
  {
    id: 'nova',
    voiceId: 'nova',
    label: 'Nova',
    description: 'Warm talkshow host — casual, playful, conversational',
    gender: 'female',
    accent: 'American'
  },
  {
    id: 'coral',
    voiceId: 'coral',
    label: 'Coral',
    description: 'Wire-service correspondent — clear, objective, neutral',
    gender: 'female',
    accent: 'American'
  }
];

export const voiceInstructions: Record<string, string> = {
  onyx: 'Deliver with the gravity of a veteran anchor at a major network. Use a low, steady register with measured, deliberate pacing. Enunciate every word with crisp precision. Pause intentionally after headlines and critical facts to let information land. Maintain unwavering composure—no excitement, no filler. Convey authority through tonal weight and absolute clarity.',
  fable: 'Bring the energy of a prime-time sports or political commentator. Use rapid-fire delivery with dramatic inflection shifts—accelerate through background context, then punch key analysis with emphatic force. Build tension before hot takes. Use dynamic volume: lean in quieter for setup, then explode with conviction on the payoff. Slight breathlessness is fine—this is live, unfiltered reaction.',
  nova: 'Talk like you\'re on a couch with your best friend and a glass of wine. Keep it loose, warm, and genuinely playful. Laugh naturally at absurdities—let chuckles interrupt sentences authentically. Use casual contractions, rhetorical questions, and exaggerated reactions. Pace should feel spontaneous, not scripted. Drop your voice to a conspiratorial whisper for gossip, then burst back with infectious energy.',
  coral: 'Deliver as a wire-service correspondent: clear, objective, and emotionally neutral. Maintain a steady mid-register with consistent volume. Use precise diction and a metronomic pace—no rushing, no dramatic pauses. Strip out all personality inflection; let the facts carry the weight. Transition between stories with clean, minimal bridging. Convey professionalism through restraint and absolute clarity.',
};
