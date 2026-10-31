export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body ?? {}); // ZodError errorHandler pakad lega
  next();
};
