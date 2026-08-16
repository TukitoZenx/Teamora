const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

let dummyHashPromise = null;
const getDummyHash = () => {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash('timing-pad-not-a-password', SALT_ROUNDS);
  }
  return dummyHashPromise;
};

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = async (password, passwordHash) => {
  if (!passwordHash) {
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }
  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword
};
