import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { apps } from "@/db/schema";
import { cardFields, getAppIcons } from "@/lib/directory/directory-shared";

export const dictationAppSlugs = [
  "voiceink",
  "wispr-flow",
  "spokenly",
  "superwhisper",
  "voiceos",
  "macwhisper",
] as const;

export type DictationAppSlug = (typeof dictationAppSlugs)[number];
export type ComparisonValue = {
  label: string;
  state?: "yes" | "partial" | "no" | "unknown";
  note?: string;
};

export type DictationComparisonRow = {
  key: string;
  label: string;
  description: string;
  values: Record<DictationAppSlug, ComparisonValue>;
};

export const dictationComparisonRows: DictationComparisonRow[] = [
  {
    key: "price",
    label: "Price",
    description: "The lowest generally available plan for ongoing use.",
    values: {
      macwhisper: { label: "Pro €64 one-time" },
      spokenly: { label: "Pro $8.33/mo annually" },
      superwhisper: { label: "Pro $8.49/mo" },
      voiceink: { label: "$25 one-time purchase" },
      voiceos: { label: "Pro $11.99/mo annually" },
      "wispr-flow": { label: "Pro $15/mo" },
    },
  },
  {
    key: "offline",
    label: "Offline transcription",
    description: "Can process speech on the Mac without sending audio to a cloud model.",
    values: {
      macwhisper: { label: "Yes", state: "yes" },
      spokenly: { label: "Yes", state: "yes", note: "Includes a network-blocking Local Only Mode." },
      superwhisper: { label: "Yes", state: "yes" },
      voiceink: { label: "Yes", state: "yes" },
      voiceos: { label: "No", state: "no", note: "VoiceOS documents cloud-based dictation and agent workflows, not offline transcription." },
      "wispr-flow": { label: "No", state: "no", note: "Cloud processing." },
    },
  },
  {
    key: "file-transcription",
    label: "Audio and video files",
    description: "Imports recordings for transcription outside live dictation.",
    values: {
      macwhisper: { label: "Yes", state: "yes" },
      spokenly: { label: "Yes", state: "yes" },
      superwhisper: { label: "Yes", state: "yes" },
      voiceink: { label: "Yes", state: "yes" },
      voiceos: { label: "No", state: "no", note: "No general audio or video file-import workflow is documented." },
      "wispr-flow": { label: "No", state: "no", note: "Wispr Flow offers Notetaker for meetings, but not general audio or video file import." },
    },
  },
  {
    key: "meeting-transcription",
    label: "Meeting transcription",
    description: "Records and transcribes live meetings as a dedicated workflow, rather than importing a saved recording.",
    values: {
      macwhisper: { label: "Yes", state: "yes", note: "Records and transcribes calls from Zoom, Teams, Webex, Skype, Discord, and other Mac audio." },
      spokenly: { label: "Yes", state: "yes", note: "Can record meetings using system audio and the selected microphone." },
      superwhisper: { label: "Yes", state: "yes", note: "Supports meeting capture with speaker labels." },
      voiceink: { label: "No", state: "no", note: "Can import meeting recordings as files, but does not provide a dedicated live meeting recorder." },
      voiceos: { label: "No", state: "no", note: "No dedicated meeting-transcription workflow is documented." },
      "wispr-flow": { label: "Yes", state: "yes", note: "Notetaker records meetings and produces transcripts and summaries." },
    },
  },
  {
    key: "vocabulary",
    label: "Custom vocabulary",
    description: "Learns or replaces names, technical terms, and recurring phrases.",
    values: {
      macwhisper: { label: "Yes", state: "yes" },
      spokenly: { label: "Yes", state: "yes" },
      superwhisper: { label: "Yes", state: "yes" },
      voiceink: { label: "Yes", state: "yes" },
      voiceos: { label: "Yes", state: "yes" },
      "wispr-flow": { label: "Yes", state: "yes" },
    },
  },
  {
    key: "model-prompt-control",
    label: "AI model and prompt control",
    description: "Lets users choose AI models or providers and create custom processing instructions.",
    values: {
      macwhisper: { label: "Yes", state: "yes", note: "Supports custom prompts, local models, and multiple cloud providers." },
      spokenly: { label: "Yes", state: "yes", note: "Modes can combine custom AI instructions, transcription models, providers, and output actions." },
      superwhisper: { label: "Yes", state: "yes", note: "Supports configurable modes plus local and cloud speech and language models." },
      voiceink: { label: "Yes", state: "yes", note: "Modes support custom prompts, context, local models, and optional cloud providers." },
      voiceos: { label: "Limited", state: "partial", note: "Provides polish styles, integrations, and custom MCP connections, but not the same model-level control." },
      "wispr-flow": { label: "Limited", state: "partial", note: "Provides writing styles and workflow settings without direct model or provider selection." },
    },
  },
  {
    key: "source",
    label: "Open source",
    description: "Whether the application source code is publicly available.",
    values: {
      macwhisper: { label: "No", state: "no" },
      spokenly: { label: "No", state: "no" },
      superwhisper: { label: "No", state: "no" },
      voiceink: { label: "Yes", state: "yes" },
      voiceos: { label: "No", state: "no" },
      "wispr-flow": { label: "No", state: "no" },
    },
  },
];

export const dictationEditorial: Record<DictationAppSlug, {
  bestFor: string;
  tagline: string;
  summary: string[];
  strengths: string[];
  considerations: string[];
  sourceUrl: string;
}> = {
  macwhisper: {
    bestFor: "Recorded audio and detailed transcripts",
    tagline: "A full transcription workspace for recordings, meetings, and private files.",
    summary: [
      "MacWhisper is the most complete transcription workspace in this comparison. You can drag in audio or video, record from a microphone, capture audio from Mac apps, and record calls from Zoom, Teams, Webex, Skype, and Discord. The resulting transcript is searchable and can identify speakers, remove filler words, and export to formats including TXT, Markdown, PDF, DOCX, SRT, and VTT.",
      "Its strongest argument is control. Local Whisper models can process sensitive material without sending it away from your Mac, while optional cloud services and AI providers are available when you want summaries, custom prompts, or different models. Pro also adds batch transcription, watched folders, automation workflows, and command-line control, which makes MacWhisper useful well beyond occasional voice typing.",
    ],
    strengths: [
      "Excellent handling of existing audio and video, with batch jobs, speaker recognition, subtitle export, and broad document-export options.",
      "Local transcription keeps private recordings on the Mac, while optional cloud and bring-your-own-key services leave room for more advanced processing.",
      "The €64 Pro licence is a one-time purchase with lifetime updates rather than another recurring subscription.",
    ],
    considerations: [
      "MacWhisper is primarily a transcription workspace, so it can feel heavier than a focused push-to-talk utility if your only goal is replacing the keyboard in everyday apps.",
      "System-wide dictation is available through the direct-download edition rather than the Mac App Store version. Larger and more accurate local models also need more memory and perform best on newer Macs.",
    ],
    sourceUrl: "https://www.macwhisper.com/",
  },
  spokenly: {
    bestFor: "Flexible free local dictation",
    tagline: "Free offline voice typing with unusual freedom over models and providers.",
    summary: [
      "Spokenly is built around a simple push-to-talk loop: hold a shortcut, speak, and release to place punctuated text in the active app. Underneath that straightforward interaction is one of the most flexible model systems here. It supports on-device Whisper and Parakeet models, cloud transcription through your own API keys, and a managed Pro service with premium transcription and text-processing models.",
      "Modes can bundle a transcription model, AI instructions, output behavior, and app or website triggers into reusable workflows. One mode might clean up an email, another can translate speech, and another can paste text and press Enter automatically. On Mac, Agentic Actions extend the same voice interface into hands-free computer control.",
    ],
    strengths: [
      "Unlimited local transcription is free, requires no account, and supports more than 100 languages through downloadable models.",
      "Local Only Mode blocks network access completely, providing a stronger privacy guarantee than simply selecting an on-device model.",
      "Bring-your-own-key support and configurable modes let experienced users balance cost, accuracy, privacy, formatting, and output actions.",
    ],
    considerations: [
      "The freedom to choose among local models, provider keys, AI instructions, and modes introduces more setup than a service with one automatic model.",
      "Accuracy and latency depend on the model and hardware you select. The paid plan mainly adds managed cloud models, hosted text processing, syncing, and support, so it is most valuable to people who do not want to configure providers themselves.",
    ],
    sourceUrl: "https://spokenly.app/",
  },
  superwhisper: {
    bestFor: "Advanced writing modes and model choice",
    tagline: "Context-aware dictation that reshapes speech for the app you are using.",
    summary: [
      "Superwhisper is designed for people who dictate throughout the day and want the first result to need less editing. Its system-wide shortcut places text at the cursor, while Super Mode can use the surrounding app context to adjust structure, tone, grammar, and formatting. That makes the same spoken thought read appropriately as an email, message, document, or coding prompt.",
      "The app separates speech recognition from optional language-model rewriting, giving you a broad mix of on-device and cloud models. It also covers meetings and imported audio or video files, supports more than 100 languages, and can translate between them. This breadth makes it closer to a configurable voice-writing layer than a basic transcription utility.",
    ],
    strengths: [
      "Context-aware modes can produce polished, app-appropriate text instead of a minimally punctuated raw transcript.",
      "Local models work without an internet connection, while cloud options offer lower latency or higher accuracy when privacy is less important.",
      "Meeting capture, file transcription, automatic language detection, translation, and cross-platform licensing broaden its value beyond Mac-only dictation.",
    ],
    considerations: [
      "Many of the features that make Superwhisper distinctive, including its strongest cloud models and advanced workflows, are part of the Pro subscription.",
      "On-device model speed and accuracy depend on your hardware. Apple-silicon Macs are the natural fit, while users who want a simple, fixed dictation experience may find the model and mode choices more involved than necessary.",
    ],
    sourceUrl: "https://superwhisper.com/",
  },
  voiceink: {
    bestFor: "Private, configurable Mac dictation",
    tagline: "A native, open-source voice-to-text tool that keeps local processing central.",
    summary: [
      "VoiceInk is a native macOS dictation app for users who want local speech recognition without giving up advanced controls. A global shortcut records your voice, runs it through the selected local or optional cloud model, and inserts the result at the cursor. Different modes can change the model, enhancement instructions, context sources, output action, and shortcut for a particular app or website.",
      "Its personal dictionary handles names and technical terms, while deterministic replacements correct recurring mistakes. Optional context-aware enhancement can use selected text, clipboard contents, or visible screen text to produce a more relevant result. The source code is public, and local models keep audio on the Mac unless you deliberately configure an outside provider.",
    ],
    strengths: [
      "Open-source code and local-first processing make the app unusually inspectable for privacy-conscious users.",
      "Modes, global shortcuts, a personal dictionary, replacements, and context controls provide detailed workflow customization.",
      "The one-time licence avoids a permanent subscription, and optional providers remain under the user’s control.",
    ],
    considerations: [
      "VoiceInk requires Apple silicon and macOS 14.4 or later, so Intel Macs and older operating-system installations are excluded.",
      "Local models consume storage and system resources, and the best balance of speed and accuracy may require experimentation. Cloud-powered enhancement is optional, but enabling it changes the otherwise local privacy model.",
    ],
    sourceUrl: "https://tryvoiceink.com/",
  },
  voiceos: {
    bestFor: "Voice-driven actions beyond dictation",
    tagline: "Dictation paired with an assistant that can act across your Mac.",
    summary: [
      "VoiceOS combines conventional system-wide dictation with an Agent Mode intended to carry out spoken requests. Dictation Mode removes filler words, fixes grammar, applies polish styles, and writes into apps such as Gmail, Slack, Notion, Messages, and Obsidian. Custom vocabulary, replacements, and voice editing of selected text help refine everyday output.",
      "Agent Mode is the differentiator. It can use screen awareness, search the web, connect to supported apps or custom MCP servers, and prepare actions such as sending an email, scheduling a meeting, or finding a file. That makes VoiceOS broader than speech-to-text, though the extra scope also means it should be judged as an AI assistant rather than only as a dictation engine.",
    ],
    strengths: [
      "Dictation and agent actions share one voice interface, which is useful for people who want to operate software as well as enter text.",
      "It works across Mac and Windows, advertises 100 languages, and includes polish styles plus custom vocabulary and replacements.",
      "Transcripts are stored locally, the service says audio is not retained without permission, and Agent Mode asks before taking actions.",
    ],
    considerations: [
      "VoiceOS relies more heavily on cloud services and connected integrations than a local transcription tool, so privacy requirements need to be evaluated feature by feature.",
      "The Pro plan costs $11.99 per month when billed annually and requires a card for its seven-day trial. A limited free tier remains after cancellation, but users focused only on dictation may be paying for agent features they do not need.",
    ],
    sourceUrl: "https://www.voiceos.com/",
  },
  "wispr-flow": {
    bestFor: "Polished writing across devices",
    tagline: "Fast cloud dictation with formatting, vocabulary learning, and cross-device reach.",
    summary: [
      "Wispr Flow prioritizes low-friction voice writing across Mac, Windows, iOS, and Android. On the Mac, you hold a shortcut, speak naturally, and release to insert formatted text into the active field. Hands-free mode supports longer thoughts, while writing styles can adapt the result for messages, documents, and other recurring situations.",
      "Flow learns names and specialist terms through its dictionary, expands spoken trigger phrases into reusable snippets, and can use on-screen context to improve recognition. Its newer Command Mode can edit text or run spoken instructions, while the Mac Notetaker adds a meeting-focused workflow. The result is a polished, connected product aimed at frequent dictation rather than offline file transcription.",
    ],
    strengths: [
      "The push-to-talk interaction is easy to learn, and automatic punctuation and formatting produce clean text in nearly any app.",
      "Dictionary entries, replacements, snippets, configurable shortcuts, hands-free mode, and contextual recognition reduce friction for frequent users.",
      "Support across desktop and mobile platforms makes it a strong choice for people who want one familiar voice workflow on several devices.",
    ],
    considerations: [
      "Transcription is cloud-based, so it is not the right option when audio must remain entirely offline or when an internet connection is unavailable.",
      "The Pro plan is the most expensive recurring subscription in this group at $15 per month. Desktop recordings also have a practical duration limit of about six minutes, and some advanced features, including Command Mode, require a paid plan.",
    ],
    sourceUrl: "https://wisprflow.ai/",
  },
};

export const dictationRecommendations = [
  {
    award: "Best overall",
    choice: "VoiceInk",
    slug: "voiceink",
    reason: "It combines open-source code, local-first transcription, optional cloud and local AI providers, context-aware modes, custom vocabulary, and a one-time purchase.",
    tradeoff: "It offers much of the flexibility associated with subscription-based tools such as Superwhisper while giving you more control over models, providers, privacy, and long-term cost. It requires Apple silicon and macOS 14.4 or later.",
  },
  {
    award: "Best for recordings",
    choice: "MacWhisper",
    slug: "macwhisper",
    reason: "The most capable option for interviews, meetings, podcasts, subtitles, speaker-labelled transcripts, batch processing, and flexible exports.",
    tradeoff: "Choose it when recorded media matters more than lightweight voice typing. The €64 Pro licence is a particularly good long-term value.",
  },
  {
    award: "Best polished cloud experience",
    choice: "Wispr Flow",
    slug: "wispr-flow",
    reason: "It provides fast system-wide dictation, automatic formatting, learned vocabulary, reusable snippets, and a consistent experience across Mac, Windows, iOS, and Android.",
    tradeoff: "Choose it when convenience and cross-device support matter more than offline processing. It requires cloud transcription, and the Pro plan costs $15 per month.",
  },
] as const;

export async function getPublishedDictationApps() {
  const database = await getDatabase();
  const records = await database
    .select(cardFields)
    .from(apps)
    .where(and(
      eq(apps.status, "published"),
      isNull(apps.deletedAt),
      inArray(apps.slug, [...dictationAppSlugs]),
    ))
    .orderBy(asc(apps.name));
  const icons = await getAppIcons(records.map(({ id }) => id));
  const bySlug = new Map(records.map((record) => [record.slug, { ...record, icon: icons.get(record.id) ?? null }]));
  return dictationAppSlugs.map((slug) => bySlug.get(slug)).filter((app): app is NonNullable<typeof app> => Boolean(app));
}
