import { ChatPromptTemplate } from 'langchain/prompts';
import { BaseMessageChunk } from 'langchain/schema';
import type { OpenAI as OpenAIClient } from 'openai';

export const NOTES_TOOL_SCHEMA: OpenAIClient.ChatCompletionTool = {
	type: 'function',
	function: {
		name: 'formatNotes',
		description: 'Formats the notes response',
		parameters: {
			type: 'object',
			properties: {
				notes: {
					type: 'object',
					properties: {
						note: {
							type: 'string',
							description: 'The notes',
						},
						pageNumbers: {
							type: 'array',
							items: {
								type: 'number',
								description: 'The page number(s) of the notes',
							},
						},
					},
				},
			},
			required: ['notes'],
		},
	},
};

export const NOTE_PROMPT = ChatPromptTemplate.fromMessages([
	[
		'ai',
		`Take notes the following scientific page.
    This is a technical/scientific paper.
    The goal is to be able to create a complete understanding of the paper.

    Rules:
        - Include scientific quotes and details inside your notes.
        - Respond with as many notes as it might take to cover the entire paper.
        - Go into as much details as you can, while keeping each note on very specific part of the paper.
        - Include notes about the results of any experiments the paper described.
        - Include notes about any steps to reproduce the results of the experiments.
        - DO NOT respond with notes like: "The author discusses how well XYZ works.", instead explain what XYZ is and how it works.

    Respond with a JSON array with two keys: "notes" and "pageNumbers".
    "notes" will be a specific note, and "pageNumbers" will be an array of the page numbers of the note.
    Take a deep breath, and work your way through the paper step by step.
    `,
	],
	['human', 'Paper: {paper}'],
]);

export type PaperNote = {
	note: string;
	pageNumbers: number[];
};

export const outputParser = (output: BaseMessageChunk): PaperNote[] => {
	const toolCalls = output.additional_kwargs.tool_calls;

	if (!toolCalls?.length) {
		throw new Error('No tool calls found');
	}

	const notes: PaperNote[] = toolCalls.map((call) => {
		const { notes } = JSON.parse(call.function.arguments);
		return notes;
	});

	return notes;
};
