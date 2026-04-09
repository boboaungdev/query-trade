export const reqLogger = (req, res, next) => {
  const fullUrl = `${req.originalUrl}`;
  // const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  console.log([req.method, fullUrl]);
  next();
};
