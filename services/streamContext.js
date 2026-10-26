const { AsyncLocalStorage } = require("async_hooks");
const als = new AsyncLocalStorage();

module.exports = {
  runWithStream: (ctx, fn) => als.run(ctx, fn),
  getStream: () => als.getStore(),
};