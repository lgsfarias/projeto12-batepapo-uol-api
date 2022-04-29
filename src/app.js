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
        .regex(/^(message|private_message|status)$/)
        .required(),
    time: joi.string(),
});

app.post('/participants', async (req, res) => {
    try {
        const { name } = req.body;
        const { value, error } = userSchema.validate({ name });
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
    try {
        const { to, text, type } = req.body;
        const from = req.headers.user;

        const { value, error } = messageSchema.validate({
            from,
            to,
            text,
            type,
        });
        if (error) {
            res.status(422).send(error.details[0].message);
            return;
        }

        const activeParticipant = await db
            .collection('participants')
            .findOne({ name: from });
        if (!activeParticipant) {
            res.status(422).send('participante não encontrado');
            return;
        }

        const messages = await db.collection('messages').insertOne({
            ...value,
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
                    { to: 'Todos' },
                    { to: user },
                    { from: user },
                ],
            })
            .toArray();

        res.send(messages.slice(limit ? -limit : null));
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

app.post('/status', async (req, res) => {
    try {
        const { user } = req.headers;
        const { value, error } = userSchema.validate({ name: user });
        if (error) {
            res.status(422).send(error.details[0].message);
            return;
        }

        const activeParticipant = await db
            .collection('participants')
            .findOne({ name: user });
        if (!activeParticipant) {
            res.sendStatus(404);
            return;
        }

        // const { lastStatus } = activeParticipant;
        const status = await db
            .collection('participants')
            .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(chalk.green(`Server running on port ${PORT}`));
});
