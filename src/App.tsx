import { useState, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Mic2, Music, Globe, Clock, FileText, Copy, Check, Radio, Newspaper, Scale } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { countries, continents } from './data/countries';
import { timeframes } from './data/timeframes';
import { topics } from './data/topics';
import { voices } from './data/voices';
import { musicSuites } from './data/music';
import { biasOptions, biasAgent1Instructions, biasEditorialGuidelines } from './data/bias';
import { BiasSelector } from './components/BiasSelector';
import type { Country, Continent, Timeframe, Topic as TopicType, Voice, MusicSuite, BiasPosition } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [selectedContinent, setSelectedContinent] = useState<Continent>(Object.values(continents)[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('daily');
  const [selectedTopics, setSelectedTopics] = useState<TopicType[]>(['General News']);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(voices[0]);
  const [selectedMusicSuite] = useState<MusicSuite>(musicSuites[0]);
  const [selectedBias, setSelectedBias] = useState<BiasPosition>('moderate');
  const [includeEditorialSegment, setIncludeEditorialSegment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate prompt
  const promptResult = useMemo(() => {
    return generateAgentSwarmPrompt({
      country: selectedCountry,
      continent: selectedContinent,
      timeframe: selectedTimeframe,
      topics: selectedTopics,
      voice: selectedVoice,
      musicSuite: selectedMusicSuite,
      bias: selectedBias,
      includeEditorialSegment
    });
  }, [selectedCountry, selectedContinent, selectedTimeframe, selectedTopics, selectedVoice, selectedMusicSuite, selectedBias, includeEditorialSegment]);

  // Handle country selection
  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    const continent = continents[country.continentCode];
    if (continent) {
      setSelectedContinent(continent);
    }
    toast.success(`Selected ${country.name}`);
  }, []);

  // Handle topic toggle
  const handleTopicToggle = useCallback((topic: TopicType) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== topic);
      }
      if (prev.length >= 3) return prev;
      return [...prev, topic];
    });
  }, []);

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptResult);
      setCopied(true);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy prompt');
    }
  }, [promptResult]);

  // Generate the agent swarm prompt
  function generateAgentSwarmPrompt(config: {
    country: Country;
    continent: Continent;
    timeframe: Timeframe;
    topics: TopicType[];
    voice: Voice;
    musicSuite: MusicSuite;
    bias: BiasPosition;
    includeEditorialSegment: boolean;
  }): string {
    const today = new Date().toISOString().split('T')[0];
    const timeframeConfig = {
      daily: { label: 'Daily Briefing', days: 1 },
      weekly: { label: 'Weekly Review', days: 7 },
      monthly: { label: 'Monthly Roundup', days: 30 }
    }[config.timeframe];

    const biasConfig = biasOptions.find(b => b.id === config.bias)!;
    const biasLabel = biasConfig.label;

    return `# AI NEWSROOM - Agent Swarm Prompt
## ${config.country.name} ${timeframeConfig.label} - ${today}

### Configuration
- **Country**: ${config.country.name} (${config.country.language})
- **Continent**: ${config.continent.name}
- **Timeframe**: ${timeframeConfig.label} (past ${timeframeConfig.days} day${timeframeConfig.days > 1 ? 's' : ''})
- **Topics**: ${config.topics.join(', ')}
- **Voice**: ${config.voice.label}
- **Editorial Perspective**: ${biasLabel}
- **Include Editorial Segment**: ${config.includeEditorialSegment ? 'Yes' : 'No'}

### News Sources
- **${config.country.name} sources** (${config.country.language}): ${config.country.newsSources.join(', ')}
- **${config.continent.name} sources** (English): ${config.continent.newsSources.map(s => s.name).join(', ')}

---

### EDITORIAL PERSPECTIVE
**Selected Bias**: ${biasLabel}

**CRITICAL INSTRUCTION FOR ALL AGENTS:**
Every agent MUST maintain ${biasLabel} perspective throughout.
This affects HOW facts are presented, NOT WHICH facts are reported.
Never invent facts. Never omit relevant facts.

---

## AGENT SWARM ARCHITECTURE

### AGENT 1: NEWS RESEARCHER
Search for news from the past ${timeframeConfig.days} day(s) using web_search.

### EDITORIAL PERSPECTIVE FOR FIRST DRAFT

When writing the first draft script, frame all facts through ${biasLabel} perspective.

**How to Apply ${biasLabel}:**

${biasAgent1Instructions[config.bias]}

**REMEMBER**: Same facts, different framing. Never invent facts. Never omit relevant facts.

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT REQUIREMENTS:**
- Include Editorial Segment after Continent News block
- Minimum 2500 characters
- Apply ${biasLabel} perspective MOST prominently (higher intensity than news segments)
- Analyze themes from both ${config.country.name} and ${config.continent.name} blocks
- Provide closure and wrap up the podcast` : ''}

---

### AGENT 2: THE EDITOR
Review and refine the script for quality and accuracy.

**BIAS VERIFICATION - MANDATORY:**

Verify the script correctly applies **${biasLabel}** perspective:

- [ ] Headlines reflect ${biasLabel} framing (not neutral)
- [ ] Story order prioritizes ${biasLabel} priorities
- [ ] Language choices align with ${biasLabel} terminology
- [ ] Quote selection gives voice to ${biasLabel}-aligned sources
- [ ] No contradictory framing from opposing perspectives (unless for contrast)

**REJECT IF BIAS IS INCORRECT OR INCONSISTENT:**

If the draft reads like a different bias was applied:
- Return to Agent 1 with specific feedback
- Example: "This reads Moderate, but Moderate Left was selected. Add more focus on policy impact on workers."

**BIAS CONSISTENCY CHECK:**
- Does the entire script maintain ${biasLabel} throughout?
- Are there sections that suddenly sound neutral or opposite-bias?
- If inconsistent: REJECT and request rewrite with consistent ${biasLabel} framing

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT VERIFICATION:**

- [ ] Minimum 2500 characters
- [ ] ${biasLabel} especially prominent (more intense than news segments)
- [ ] Connects themes from both ${config.country.name} and ${config.continent.name} news
- [ ] Provides analytical closure (not just summary)
- [ ] Natural transition to sign-off
- [ ] Sentence length: 60% between 15-30 words, average >15

**REJECT IF:**
- Editorial is neutral/balanced when ${biasLabel} was selected
- Less than 2500 characters
- Doesn't reference themes from the broadcast
- Sounds like a separate piece (disconnected from news)
- Bias intensity is same as or less than news segments` : ''}

---

### AGENT 3: THE WRITER
Polish the approved script for clarity, flow, and impact.

**PHASE 2: POLISH FOR ${biasLabel.toUpperCase()} IMPACT**

Polish the approved script to maximize ${biasLabel} clarity and impact:

- Strengthen ${biasLabel} framing where weak
- Ensure consistent ${biasLabel} terminology
- Verify ${biasLabel} perspective is clear in every segment
- Maintain oral readability (60% sentences 15-30 words, average >15)
- Keep all facts accurate and verifiable

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT POLISH:**
- Strengthen ${biasLabel} framing for maximum impact
- Ensure thematic connections between stories are clear
- Verify minimum 2500 characters
- Maintain connection to reported stories (don't go off-topic)
- Ensure smooth transition to sign-off` : ''}

---

### AGENT 4: FACT CHECKER
Verify all claims using web_search.

---

### AGENT 5: AUDIO PRODUCER
Generate the final podcast using generate_speech with voice ${config.voice.voiceId}.

---

## MUSIC CUES
- Intro: ${config.musicSuite.intro.name}
- Outro: ${config.musicSuite.outro.name}
- Story Sting: ${config.musicSuite.storySting.name}
- Block Transition: ${config.musicSuite.blockSting.name}

${config.includeEditorialSegment ? `---

### EDITORIAL SEGMENT

**Position**: After Continent News block, before Sign-off

**Purpose**: Provide thematic analysis and editorial closure

**Requirements:**
- **Minimum Length**: 2500 characters
- **Bias Intensity**: HIGHEST - ${biasLabel} perspective MOST prominent here
- **Content**: Analyze main themes from ${config.country.name} and ${config.continent.name} news
- **Style**: Editorial/opinion, not neutral reporting

**Structure:**
1. **Opening Hook** (2-3 sentences)
   - Reference 2-3 key stories from the broadcast
   - Set up the analytical frame

2. **Thematic Analysis** (60% of segment)
   - Connect dots between different stories
   - Identify patterns and trends across both blocks
   - Apply ${biasLabel} interpretive lens

3. **${biasLabel} Perspective** (30% of segment)
   - Explicitly state the ${biasLabel} viewpoint
   - Why these stories matter through ${biasLabel} lens
   - What should be done (policy/cultural implications)

4. **Closing** (10% of segment)
   - Memorable final thought
   - Return to big picture
   - Transition to sign-off

**${biasLabel} Editorial Guidelines:**

${biasEditorialGuidelines[config.bias]}

**CRITICAL**: Editorial must feel like natural conclusion, connected to reported stories. Never invent facts.` : ''}
`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Newsroom</h1>
              <p className="text-sm text-slate-400">Configure your automated news podcast</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Configuration */}
          <div className="space-y-4">
            
            {/* Geographic Selection */}
            <Section icon={Globe} title="Geographic Selection">
              <div className="space-y-3">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    if (country) handleCountrySelect(country);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm"
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.language})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Continent: {selectedContinent.name}</span>
                  <span>•</span>
                  <span>{selectedCountry.newsSources.length} news sources</span>
                </div>
              </div>
            </Section>

            {/* Timeframe */}
            <Section icon={Clock} title="Timeframe">
              <div className="grid grid-cols-3 gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all",
                      selectedTimeframe === tf.value
                        ? "bg-blue-900/30 border-blue-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                    )}
                  >
                    <div className="font-medium">{tf.label.split(' ')[0]}</div>
                    <div className="text-xs opacity-70">{tf.days} day{tf.days > 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Topics */}
            <Section icon={Newspaper} title="Topics">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm text-left transition-all border",
                      selectedTopics.includes(topic)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: {selectedTopics.length}/3
              </p>
            </Section>

            {/* Voice Selection */}
            <Section icon={Mic2} title="Voice Selection">
              <div className="space-y-2">
                {voices.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      selectedVoice.id === voice.id
                        ? "bg-blue-900/30 border-blue-500"
                        : "bg-slate-800 border-slate-700 hover:bg-slate-750"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      selectedVoice.id === voice.id ? "bg-blue-500/20" : "bg-slate-700"
                    )}>
                      <Mic2 className={cn("w-5 h-5", selectedVoice.id === voice.id ? "text-blue-400" : "text-slate-400")} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", selectedVoice.id === voice.id ? "text-white" : "text-slate-300")}>
                          {voice.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {voice.gender === 'male' ? '♂' : '♀'} {voice.accent}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{voice.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Editorial Settings */}
            <Section icon={Scale} title="Editorial Settings">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Editorial Perspective</h3>
                  <BiasSelector value={selectedBias} onChange={setSelectedBias} />
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEditorialSegment}
                      onChange={(e) => setIncludeEditorialSegment(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Include Editorial Segment</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Music Suite */}
            <Section icon={Music} title="Music Suite">
              <div className="space-y-3">
                {([
                  { key: 'intro', label: 'Intro Music' },
                  { key: 'outro', label: 'Outro Music' },
                  { key: 'storySting', label: 'Story Sting' },
                  { key: 'blockSting', label: 'Block Transition' }
                ] as const).map(slot => (
                  <div key={slot.key} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                    <div className="text-sm font-medium text-slate-300 mb-2">{slot.label}</div>
                    <select
                      value={selectedMusicSuite[slot.key].id}
                      onChange={() => {
                        // Simplified - would need proper state management
                      }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm"
                    >
                      <option value="orch_a">Orchestral A</option>
                      <option value="modern_b">Modern B</option>
                      <option value="nordic_c">Nordic C</option>
                      <option value="bbc_d">BBC Style</option>
                      <option value="contemp_e">Contemporary E</option>
                    </select>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            
            {/* Configuration Summary */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Configuration Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Country</span>
                  <span className="text-white">{selectedCountry.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timeframe</span>
                  <span className="text-white">{timeframes.find(t => t.value === selectedTimeframe)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Topics</span>
                  <span className="text-white">{selectedTopics.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Voice</span>
                  <span className="text-white">{selectedVoice.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Editorial Perspective</span>
                  <span className="text-white">{biasOptions.find(b => b.id === selectedBias)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Include Editorial Segment</span>
                  <span className="text-white">{includeEditorialSegment ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleCopyPrompt}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all"
            >
              <FileText className="w-5 h-5" />
              {copied ? 'Copied!' : 'Copy Podcast Prompt'}
            </button>

            {/* Generated Prompt */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">Generated Prompt</span>
                <button
                  onClick={handleCopyPrompt}
                  className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <pre className="p-4 text-xs text-slate-400 overflow-auto max-h-[500px] whitespace-pre-wrap">
                {promptResult}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Section component
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default App;
