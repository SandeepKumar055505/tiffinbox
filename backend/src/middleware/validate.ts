import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).errors.map(e => `${e.path.join('.')}: ${e.message}`);
      
      // Ω.7: Log Validation Friction to Audit Pulse
      try {
        const { db } = await import('../config/db');
        await db('audit_logs').insert({
          action: 'friction.validation_error',
          target_type: 'user_request',
          after_value: JSON.stringify({ url: req.url, details, body: req.body }),
        });
      } catch {}

      return res.status(422).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}
