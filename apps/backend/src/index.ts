import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { Document } from 'langchain/document';
import { writeFile, unlink } from 'fs/promises';
import { UnstructuredLoader } from 'langchain/document_loaders/fs/unstructured';
import { formatDocumentsAsString } from 'langchain/util/document';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
	NOTES_TOOL_SCHEMA,
	NOTE_PROMPT,
	PaperNote,
	outputParser,
} from 'prompts';

async function deletePages(pdf: Buffer, pagesToDelete: number[]) {
	const doc = await PDFDocument.load(pdf);

	let numToOffsetBy = 1;

	for (const pageNum of pagesToDelete) {
		doc.removePage(pageNum - numToOffsetBy);
		numToOffsetBy++;
	}

	const docBytes = await doc.save();

	return Buffer.from(docBytes);
}

async function loadPdfFromUrl(url: string): Promise<Buffer> {
	const response = await axios.get(url, { responseType: 'arraybuffer' });

	return response.data;
}

async function convertPdfToDocuments(pdf: Buffer): Promise<Document[]> {
	if (!process.env.UNSTRUCTURED_API_KEY) {
		throw new Error('UNSTRUCTURED_API_KEY not set');
	}

	const fileName = Math.random().toString(36).substring(7);

	const pdfPath = `pdfs/${fileName}.pdf`;

	await writeFile(pdfPath, pdf, 'binary');

	const loader = new UnstructuredLoader(pdfPath, {
		apiKey: process.env.UNSTRUCTURED_API_KEY,
		strategy: 'hi_res',
	});

	const documents = await loader.load();

	await unlink(pdfPath);

	return documents;
}

async function generateNotes(documents: Document[]): Promise<PaperNote[]> {
	const documentsAsString = formatDocumentsAsString(documents);

	const model = new ChatOpenAI({
		modelName: 'gpt-4-1106-preview',
		temperature: 0.0,
	});

	const modelWithTool = model.bind({ tools: [NOTES_TOOL_SCHEMA] });

	const chain = NOTE_PROMPT.pipe(modelWithTool).pipe(outputParser);

	const response = await chain.invoke({ paper: documentsAsString });

	return response;
}

async function main({
	paperUrl,
	name,
	pagesToDelete,
}: {
	paperUrl: string;
	name: string;
	pagesToDelete?: number[];
}) {
	if (!paperUrl.endsWith('pdf')) {
		throw new Error('Not a pdf');
	}

	let pdfAsBuffer = await loadPdfFromUrl(paperUrl);

	if (!!pagesToDelete?.length) {
		pdfAsBuffer = await deletePages(pdfAsBuffer, pagesToDelete);
	}

	const documents = await convertPdfToDocuments(pdfAsBuffer);

	const notes = await generateNotes(documents);

	console.log('Notes?', notes);

	console.log('Number of notes?', notes.length);
}

main({ paperUrl: 'https://arxiv.org/pdf/2401.00400.pdf', name: 'test' });
