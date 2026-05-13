/**
 * Validate request against a Zod schema.
 * Pass: { body, query, params } — each optional
 */
exports.validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (err) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.errors?.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
};