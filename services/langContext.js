const { AsyncLocalStorage } = require("async_hooks");
const als = new AsyncLocalStorage();

module.exports = {
  runWithLang: (lang, fn) => als.run(lang || null, fn),
  getLang: () => als.getStore() || null,
};