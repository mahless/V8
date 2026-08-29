const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><input id="myInput" value="123" />`);
const input = dom.window.document.getElementById("myInput");

console.log(Object.keys(input));
console.log({ ...input });
