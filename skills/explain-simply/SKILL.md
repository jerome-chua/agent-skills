---
name: explain-simply
description: Explain a file, directory, URL, topic, or the current conversation in plain, controlled English written about 80% of the way to ASD-STE100 (Simplified Technical English). Use when the user invokes /explain-simply, optionally followed by a path, URL, or topic.
disable-model-invocation: true
argument-hint: [file | directory | URL | topic]
---

# explain-simply

Explain something in clear, controlled English. Follow ASD-STE100 (Simplified Technical English, the controlled language used for aerospace maintenance manuals) about 80% of the way: keep its writing rules, but relax its fixed dictionary so the text stays natural.

Idea from [Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479).

## Input

`$ARGUMENTS` names the subject. Decide its type:

- **File path**: read the file. Explain what it is, what it does, and how its main parts work together.
- **Directory path**: survey the tree, the entry points, the README, and the config files. Explain the purpose, the structure, and the flow between the main parts. Do not describe every file.
- **URL**: fetch the page. Explain its content.
- **Topic or question**: answer it. Search the web when the topic is recent, niche, or you are not sure of the facts.
- **Nothing**: explain the most recent subject in the conversation. If there is no clear subject, ask for one in one sentence.

Gather enough context to be correct before you write. Accuracy comes before simplicity. Do not drop a fact that the reader needs just to make a sentence shorter.

## Writing rules (the 80% of STE to keep)

Words:

- Use common, short words. Prefer "use" to "utilize", "start" to "initiate", "show" to "demonstrate".
- Give each word one meaning in the text. Do not use one word for two ideas, or two words for one idea.
- Keep technical names (function names, protocols, product names) exactly as they are. Define each technical term in simple words the first time you use it.
- Use verbs as verbs. Write "the server checks the token", not "the server performs a check of the token".
- Do not use noun clusters of more than three words. Break them up with "of", "for", or a relative clause.
- Do not use slang, idioms, or metaphors that a non-native reader can misread.

Sentences:

- Write one idea in each sentence.
- Keep descriptive sentences to 25 words or fewer. Keep instructions to 20 words or fewer.
- Use the active voice. Say who or what does the action.
- Use simple tenses: present, simple past, and simple future.
- Write instructions in the imperative: "Run the tests", not "You should run the tests".
- Use articles ("the", "a") and short linking words. Do not drop them to save space.

Structure:

- Start with a one- or two-sentence summary of what the subject is and why it exists.
- Keep paragraphs to six sentences or fewer, each with one topic.
- Use a numbered list for steps in sequence. Use a bulleted list for items in parallel.
- Use headers only when the explanation is long enough to need them.
- Put code, commands, and file paths in code formatting.

## The 20% to relax

- You do not have to limit words to the STE approved dictionary. A common everyday word is fine.
- A sentence can go a few words over the limit when splitting it makes the meaning less clear.
- Use a short example or an analogy when it makes a concept clearer than a definition does. Keep the analogy literal and short.
- Use a small diagram (ASCII or Mermaid) when the subject is a flow, a hierarchy, or a set of connected parts.

## Output

- Reply in chat by default. If the user asks for a file, write Markdown to the path they give.
- Make the length fit the subject. Do not pad. Do not repeat the summary at the end.
- Before you send, check each sentence against the rules above and rewrite any sentence that breaks them.
