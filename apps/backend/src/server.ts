import express from 'express';
import bodyParser from 'body-parser';
import { takeNotes } from 'index';

function main() {
	const app = express();
	const port = process.env.PORT || 8001;

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());

	app.get('/', (_req, res) => {
		// health check
		res.status(200).send('OK');
	});

	app.post('/take-notes', async (req, res) => {
		const { paperUrl, name, pagesToDelete } = req.body;

		const notes = await takeNotes({ paperUrl, name, pagesToDelete });

		res.status(200).json({ notes });
	});

	app.listen(port, () => {
		console.log(`App listening on port ${port}`);
	});
}

main();
