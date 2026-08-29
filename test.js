const e = {
  get target() { return { value: 'test' }; }
};
const cloned = { ...e };
console.log(cloned.target);
