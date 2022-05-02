import connect from './config/dbConnect.js';
import { userSchema, messageSchema } from './models/schemas.js';

import express, { json } from 'express';
import { ObjectId } from 'mongodb';
import cors from 'cors';
import { stripHtml } from 'string-strip-html';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

/* Conection with mongoDB */
let db;
connect().then((res) => (db = res));

setInterval(async () => {
    const participants = await db.collection('participants').find({}).toArray();
    const now = Date.now();

    const inactiveParticipants = participants.filter(
        (participant) =>
            now - participant.lastStatus >
            Number(process.env.INACTIVE_TIMEOUT || 10) * 1000
    );

    inactiveParticipants.forEach((participant) => {
        db.collection('participants').deleteOne({ _id: participant._id });
        db.collection('messages').insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: new Date().toLocaleTimeString('pt-BR'),
        });
    });
}, 15000);

app.post('/participants', async (req, res) => {
    const { value, error } = userSchema.validate(
        { ...req.body },
        { abortEarly: false }
    );
    if (error) {
        res.status(422).send(error.details.map((e) => e.message));
        return;
    }

    const name = stripHtml(req.body.name).result.trim();

    try {
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

        res.status(201).send({ name });
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
    const to = stripHtml(req.body.to).result.trim();
    const text = stripHtml(req.body.text).result.trim();
    const type = stripHtml(req.body.type).result.trim();
    const from = req.headers.user;

    const { value, error } = messageSchema.validate(
        {
            from,
            to,
            text,
            type,
        },
        { abortEarly: false }
    );
    if (error) {
        res.status(422).send(error.details.map((e) => e.message));
        return;
    }
    try {
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
    const { user } = req.headers;
    const { value, error } = userSchema.validate(
        { name: user },
        { abortEarly: false }
    );
    if (error) {
        res.status(422).send(error.details.map((e) => e.message));
        return;
    }
    try {
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

app.delete('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;

    try {
        const message = await db
            .collection('messages')
            .findOne({ _id: new ObjectId(id) });
        if (!message) {
            res.sendStatus(404);
            return;
        }
        if (message.from !== user) {
            res.sendStatus(401);
            return;
        }
        await db.collection('messages').deleteOne({ _id: new ObjectId(id) });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.put('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const { user } = req.headers;
    const { to, text, type } = req.body;
    const { value, error } = messageSchema.validate(
        {
            from: user,
            to,
            text,
            type,
        },
        { abortEarly: false }
    );
    if (error) {
        res.status(422).send(error.details.map((e) => e.message));
        return;
    }
    try {
        const activeParticipant = await db
            .collection('participants')
            .findOne({ name: user });
        if (!activeParticipant) {
            res.sendStatus(404);
            return;
        }

        const message = await db
            .collection('messages')
            .findOne({ _id: new ObjectId(id) });
        if (!message) {
            res.sendStatus(404);
            return;
        }

        if (message.from !== user) {
            res.sendStatus(401);
            return;
        }

        await db.collection('messages').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    ...value,
                    time: new Date().toLocaleTimeString('pt-BR'),
                },
            }
        );
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send(error);
        console.log(error);
    }
});

export default app;
