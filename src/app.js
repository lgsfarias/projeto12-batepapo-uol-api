import express, { json } from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import chalk from 'chalk';
import joi from 'joi';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;
const mongoClient = new MongoClient(MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('batepapo-uol-api');
});

// Joi validation
const schema = joi.object({
    name: joi.string().required(),
});

app.post('/participants', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(422).send('name deve ser strings não vazio');
        return;
    }

    const participant = await db
        .collection('participants')
        .findOne({ name: name });
    if (participant) {
        res.status(409).send('nome de usuário já está sendo usado');
        return;
    }
    try {
        // const result = await schema.validateAsync({ name }); // Validação do Joi
        const participants = await db
            .collection('participants')
            .insertOne({ name, lastStatus: Date.now() });

        const messages = await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: new Date().toLocaleTimeString('pt-BR'),
        });

        res.sendStatus(201);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/participants', async (req, res) => {
    try {
        const participants = await db
            .collection('participants')
            .find()
            .toArray();
        res.send(participants);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;

    if (!to || !text) {
        res.status(422).send('to e text devem ser strings não vazio');
        return;
    }

    if (!['message', 'private_message'].includes(type)) {
        res.status(422).send('type deve ser message ou private_message');
        return;
    }

    const activeParticipant = await db
        .collection('participants')
        .findOne({ name: from });
    if (!activeParticipant) {
        res.status(422).send('participante não encontrado');
        return;
    }

    try {
        const messages = await db.collection('messages').insertOne({
            from,
            to,
            text,
            type,
            time: new Date().toLocaleTimeString('pt-BR'),
        });
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Server running on port ${PORT}`));
});
