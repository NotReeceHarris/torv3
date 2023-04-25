const onionv3 = require('./build/index');

const keys = onionv3.generateKeys();
const v3 = onionv3.generateOnionV3(keys.privateKey);

console.log(Buffer.compare(keys.publicKey, v3.publicKey) === 0 && v3.verified);