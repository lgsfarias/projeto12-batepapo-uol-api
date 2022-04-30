import joi from 'joi';

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

export { userSchema, messageSchema };
