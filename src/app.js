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

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
const mongoClient = new MongoClient(mongoURI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db('batepapo-uol-api');
});

// Joi validation
const userSchema = joi.object({
    name: joi.string().required(),
    lastStatus: joi.number().integer(),
});

const messageSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi
        .string()
        .regex(/^(message|private_message)$/)
        .required(),
    time: joi.string().required(),
});

app.post('/participants', async (req, res) => {
    try {
        const { name } = req.body;
        const { error } = userSchema.validate({ name });
        if (error) {
            res.status(422).send(error.details[0].message);
            return;
        }

        const participant = await db
            .collection('participants')
            .findOne({ name });
        if (participant) {
            res.status(409).send('nome de usuário já está sendo usado');
            return;
        }

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

app.get('/messages', async (req, res) => {
    try {
        const { limit } = req.query;
        const { user } = req.headers;
        const messages = await db
            .collection('messages')
            .find({
                $or: [
                    { type: 'message' },
                    { type: 'status' },
                    { to: user },
                    { from: user },
                ],
            })
            .toArray();

        res.send(messages);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Server running on port ${PORT}`));
});
