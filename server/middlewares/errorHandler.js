/* eslint-disable no-unused-vars */
export const notFoundHandler = (req, res, next) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  res.status(404).json({
    status: false,
    message: `Url not found - ${fullUrl}`,
  });
};

export const errorHandler = (err, req, res, next) => {
  // console.error(err.stack)
  res.status(err.status || 500).json({
    status: false,
    message: err.message,
  });
};
