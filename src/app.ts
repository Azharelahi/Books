import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { validate } from './middleware/validate.js';

export const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});
app.get("/",(_request,response)=>{
  response.status(200).json({message:"Welcome to Bookstore API"})
})
if (process.env.NODE_ENV !== 'production') {
  app.post(
    '/_dev/validation',
    validate({ body: z.object({ value: z.string().min(3) }) }),
    (_request, response) => {
      response.status(200).json(response.locals.validatedRequest);
    },
  );
}

app.use(notFound);
app.use(errorHandler);
