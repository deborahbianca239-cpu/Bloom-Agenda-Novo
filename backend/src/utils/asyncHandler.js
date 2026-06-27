// Envolve handlers async para encaminhar erros ao middleware central.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
