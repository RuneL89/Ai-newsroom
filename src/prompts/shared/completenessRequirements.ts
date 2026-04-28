/**
 * Permanent, session-independent theme completeness requirements.
 * These rules apply to ALL theme summaries regardless of configuration.
 *
 * Placeholder variables (replaced at runtime by prompt builders):
 *   [COUNTRY_NAME]      — e.g. "France"
 *   [CONTINENT_NAME]    — e.g. "Europe"
 *   [COUNTRY_LANGUAGE]  — e.g. "French"
 *   [BIAS_LABEL]        — e.g. "Moderate"
 */

export const THEME_COMPLETENESS_REQUIREMENTS = `**THEME COMPLETENESS REQUIREMENTS - ALL MANDATORY, NO EXCEPTIONS:**

- **MANDATORY MINIMUM LENGTH**: Each theme summary MUST be AT LEAST 2000 characters. Summaries under 2000 chars are INCOMPLETE and must be expanded.
- **MANDATORY SENTENCE LENGTH DISTRIBUTION**: At least 60% of sentences must be 15-30 words. Average sentence length must be >15 words.
- **MANDATORY MULTIPLE DEVELOPMENTS**: Each theme MUST synthesize at least 3 distinct developments, events, or angles. A theme covering only one story is INCOMPLETE.
- **MANDATORY INTERNATIONAL CONTEXT**: Each theme MUST include comprehensive background for listeners unfamiliar with local politics/culture. NO ASSUMPTIONS of prior knowledge.
- **MANDATORY TERM DEFINITIONS**: ALL local terms, acronyms, organizations, and political concepts MUST be defined on first mention. NO UNDEFINED TERMS allowed.
- **MANDATORY HISTORICAL CONTEXT**: If the theme references past events, historical context MUST be provided. NO EXCEPTIONS.
- **MANDATORY CONCEPT EXPLANATION**: Country-specific terminology MUST be fully explained. NO UNEXPLAINED CONCEPTS.
- **MANDATORY ZERO-KNOWLEDGE ASSUMPTION**: Write for listeners with ZERO prior knowledge of the country's political system, geography, or recent history.
- **MANDATORY FORWARD-LOOKING CLOSE**: Each theme MUST end with a forward-looking sentence ("What to watch" or "What happens next").
- **MANDATORY SOURCE ATTRIBUTION**: Cite specific sources by name within the theme text (e.g., "According to Le Monde...").`;

export const EDITOR_COMPLETENESS_AUDIT = `**EDITOR COMPLETENESS AUDIT - REJECT IF ANY REQUIREMENT FAILS:**

- **REJECT IF UNDER 2000 CHARS**: Any theme summary under 2000 characters is AUTOMATICALLY REJECTED. Return to Writer for mandatory expansion.
- **REJECT IF <3 DISTINCT DEVELOPMENTS**: A theme must cover at least 3 distinct angles, events, or trends. Fewer = REJECT.
- **REJECT IF <60% OF SENTENCES ARE 15-30 WORDS**: At least 60% of sentences must be 15-30 words.
- **REJECT IF AVERAGE SENTENCE LENGTH <15 WORDS**: Average sentence length must be >15 words.
- **REJECT IF INTERNATIONAL LISTENER WOULD GOOGLE**: If a listener from another continent wouldn't understand without searching, REJECT.
- **REJECT IF ANY UNDEFINED TERMS**: Every local reference, term, acronym, organization MUST be defined. Missing any = REJECT.
- **REJECT IF MISSING FORWARD-LOOKING CLOSE**: Every theme must end with "what to watch". Missing = REJECT.
- **REJECT IF ASSUMES PRIOR KNOWLEDGE**: Any theme assuming listener knows country's internal affairs = REJECT.
- **REJECT IF [COUNTRY_NAME] STORIES IN [CONTINENT_NAME] BLOCK**: Continent themes must ONLY contain other [CONTINENT_NAME] countries.
- **REJECT IF [CONTINENT_NAME] NEWS LACKS CONTINENT ANGLE**: Themes happening outside [CONTINENT_NAME] WITHOUT [CONTINENT_NAME]-specific angle = REJECT.`;

export const COHERENCE_REQUIREMENTS = `**CROSS-THEME COHERENCE REQUIREMENTS - MANDATORY:**

- **[TRANSITIONS]**: Theme 2, Theme 3, Theme 4, Theme 5, and Theme 6 must each open with a 1-sentence bridge connecting it to the previous theme (or the intro for Theme 1).
- **[PROGRESSION]**: The 6 themes must show logical flow: Local Topic 1 → Local Topic 2 → Local Topic 3 → Continent Topic 1 → Continent Topic 2 → Continent Topic 3.
- **[CROSS-REFERENCES]**: At least one explicit reference between themes (e.g., "This economic pressure, which we discussed in the Economy theme, is also driving the political changes we see now...").
- **[TONE CONSISTENCY]**: All themes use the same register and assumptions about listener knowledge.

**REJECT IF COHERENCE FAILS:**
If any coherence requirement is missing, REJECT and specify which requirement failed.`;

export const BIAS_VERIFICATION_CHECKLIST = `**BIAS VERIFICATION - MANDATORY:**

Verify the script correctly applies **[BIAS_LABEL]** perspective:

- [ ] Headlines reflect [BIAS_LABEL] framing (not neutral)
- [ ] Theme order prioritizes [BIAS_LABEL] priorities
- [ ] Language choices align with [BIAS_LABEL] terminology
- [ ] Source selection gives voice to [BIAS_LABEL]-aligned sources
- [ ] No contradictory framing from opposing perspectives (unless for contrast)

**REJECT IF BIAS IS INCORRECT OR INCONSISTENT:**

If the draft reads like a different bias was applied:
- Return to Agent with specific feedback
- Example: "This reads Moderate, but [BIAS_LABEL] was selected. Add more focus on policy impact on workers."

**BIAS CONSISTENCY CHECK:**
- Does the entire script maintain [BIAS_LABEL] throughout?
- Are there sections that suddenly sound neutral or opposite-bias?
- If inconsistent: REJECT and request rewrite with consistent [BIAS_LABEL] framing`;
