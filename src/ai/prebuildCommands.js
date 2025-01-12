import { languages } from "./languagesSupport";

export const PREBUILD_COMMANDS = [
  { id: 0, name: "Use this custom prompt", category: "", onlyGen: true },
  {
    id: 2,
    name: "Outliner Agent: Apply this custom prompt",
    category: "",
    onlyOutliner: true,
  },
  { id: 10, name: "Selected blocks as prompt", category: "", onlyGen: true },
  {
    id: 11,
    name: "Translate to... (<default>)",
    prompt: "translate",
    category: "TRANSLATION",
    submenu: [
      1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1111,
      1112, 1113, 1114, 1115, 1116, 1199,
    ],
  },
  {
    id: 1199,
    name: "User defined",
    prompt: "translate",
    category: "TRANSLATATION",
    isSub: true,
  },
  {
    id: 120,
    name: "Fix spelling & grammar",
    prompt: "correctWording",
    category: "REPHRASING",
    submenu: [1200, 1201, 1202],
  },
  {
    id: 1200,
    name: "Fix and explain spelling mistakes",
    prompt: "correctWordingAndExplain",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1201,
    name: "Fix spelling/grammar + suggestions",
    prompt: "correctWordingAndSuggestions",
    category: "REPHRASING",
    withSuggestions: true,
    target: "replace",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1202,
    name: "Accept corrections/suggestions",
    prompt: "acceptSuggestions",
    category: "REPHRASING",
    withSuggestions: true,
    target: "replace",
    isSub: true,
  },
  {
    id: 121,
    name: "Rephrase",
    prompt: "rephrase",
    category: "REPHRASING",
    submenu: [1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217],
  },
  {
    id: 1210,
    name: "Shorter",
    prompt: "shorten",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1211,
    name: "More accessible",
    prompt: "accessible",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1212,
    name: "Clearer and more explicit",
    prompt: "clearer",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1213,
    name: "More formal",
    prompt: "formal",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1214,
    name: "More casual",
    prompt: "casual",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 1215,
    name: "More engaging",
    prompt: "enhance",
    category: "REPHRASING",
    keyWords: "enhance, synonym",
    isSub: true,
  },
  {
    id: 1216,
    name: "More engaging with suggestions",
    prompt: "enhanceWithSuggestions",
    category: "REPHRASING",
    keyWords: "enhance, synonym",
    withSuggestions: true,
    target: "replace",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1217,
    name: "Vocabulary suggestions",
    prompt: "vocabularySuggestions",
    category: "REPHRASING",
    keyWords: "enhance, synonym",
    withSuggestions: true,
    target: "replace",
    includeUids: true,
    isSub: true,
  },
  {
    id: 122,
    name: "Outline to Paragraph",
    prompt: "linearParagraph",
    category: "REPHRASING",
    submenu: [1220],
  },
  {
    id: 1220,
    name: "Paragraph to Outline",
    prompt: "outline",
    category: "REPHRASING",
    isSub: true,
  },
  {
    id: 123,
    name: "Summarize",
    prompt: "summarize",
    category: "REPHRASING",
  },
  {
    id: 131,
    name: "Extract key insights",
    prompt: "keyInsights",
    category: "EXTRACTING",
    includeUids: true,
  },
  {
    id: 132,
    name: "Extract actionable items",
    prompt: "keyInsights",
    category: "EXTRACTING",
    includeUids: true,
  },
  {
    id: 133,
    name: "Extract highlighted texts",
    prompt: "extractHighlights",
    category: "EXTRACTING",
    includeUids: true,
  },

  // CONTENT CREATION
  {
    id: 140,
    name: "Complete sentence",
    prompt: "sentenceCompletion",
    category: "CREATION",
    target: "append",
    includeUids: true,
  },
  {
    id: 1400,
    name: "Complete paragraph",
    prompt: "paragraphCompletion",
    category: "CREATION",
    target: "append",
  },
  {
    id: 141,
    name: "Another similar content",
    prompt: "similarContent",
    category: "CREATION",
    keyWords: "extend, variant, clone",
  },

  // CRITICAL THINKING
  {
    id: 151,
    name: "Argument",
    prompt: "argument",
    category: "CRITICAL THINKING",
    includeUids: true,
    submenu: [1511, 1512, 1513],
  },
  {
    id: 1511,
    name: "Consolidate or base on evidence",
    prompt: "consolidate",
    category: "CRITICAL THINKING",
    keyWords: "argument",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1512,
    name: "Objection, counterargument",
    prompt: "objection",
    category: "CRITICAL THINKING",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1513,
    name: "Counterexample",
    prompt: "counterExample",
    category: "CRITICAL THINKING",
    includeUids: true,
    isSub: true,
  },
  {
    id: 154,
    name: "Explanation",
    prompt: "explanation",
    category: "CRITICAL THINKING",
    includeUids: true,
    submenu: [1540, 1541, 1542],
  },
  {
    id: 1540,
    name: "Definition, meaning",
    prompt: "meaning",
    category: "CRITICAL THINKING",
    keyWords: "explanation",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1541,
    name: "Causal explanation",
    prompt: "causalExplanation",
    category: "CRITICAL THINKING",
    includeUids: true,
    isSub: true,
  },
  {
    id: 1542,
    name: "Explanation by analogy",
    prompt: "analogicalExplanation",
    category: "CRITICAL THINKING",
    includeUids: true,
    isSub: true,
  },
  {
    id: 155,
    name: "Example",
    prompt: "example",
    category: "CRITICAL THINKING",
    includeUids: true,
  },
  {
    id: 156,
    name: "Raise questions",
    prompt: "raiseQuestions",
    category: "CRITICAL THINKING",
    includeUids: true,
  },
  {
    id: 157,
    name: "Challenge my ideas!",
    prompt: "challengeMyIdeas",
    category: "CRITICAL THINKING",
    includeUids: true,
  },
  // AGENTS,

  {
    id: 80,
    name: "Natural language query",
    prompt: "extractHighlights",
    category: "AGENTS",
    includeUids: true,
  },
  {
    id: 81,
    name: "Natural language :q Datomic query",
    prompt: "extractHighlights",
    category: "AGENTS",
    includeUids: true,
  },

  // OUTLINER AGENT COMMANDS
  {
    id: 20,
    icon: "properties",
    name: "Outliner Agent: Set as active outline",
    prompt: "",
    category: "",
    onlyOutliner: true,
  },
  {
    id: 21,
    icon: "properties",
    name: "Outliner Agent: Apply selected blocks as prompt",
    prompt: "",
    category: "",
    onlyOutliner: true,
  },
  // USER commands ?
  { id: 8, name: "Convert", prompt: "", category: "user" },
  { id: 9, name: "My command", prompt: "", category: "user" },
  // ... autres commandes
].concat(
  languages.map((lgg, index) => {
    return {
      id: 1100 + index,
      name: lgg[0],
      label: lgg[1],
      prompt: "translate",
      category: "TRANSLATION",
      isSub: true,
    };
  })
);
