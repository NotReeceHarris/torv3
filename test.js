const onionv3 = require('./build/index');

const keys = onionv3.generateKeys();
const v3 = onionv3.generateOnionV3(keys.privateKey);

console.log('Onion address was generated and valid: ', v3.verified);
console.log('Both public keys are equal: ', Buffer.compare(keys.publicKey, v3.publicKey) === 0);

process.exit(Buffer.compare(keys.publicKey, v3.publicKey) === 0 && v3.verified ? 0 : 1);