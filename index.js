const base32 = require("hi-base32"); // Module for encoding and decoding base32 strings
const sodium = require('sodium-native'); // Module for using cryptography functions provided by libsodium library
const crypto = require('crypto'); // Built-in module for using cryptography functions

/**
 * Function to generate a public-private key pair for signing and verifying messages
 * @param {Buffer|false} privateKey - A buffer containing the private key or false if a new key pair is to be generated
 * @returns {Object} An object containing the private and public key buffers
 */
const generateKeys = (privateKey = false) => {
    let publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES); // Allocate a new buffer for the public key

    if (privateKey === false) {
        // If no private key is provided, generate a new key pair
        privateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES); // Allocate a new buffer for the private key
        sodium.crypto_sign_keypair(publicKey, privateKey); // Generate a new key pair using sodium's crypto_sign_keypair function
    } else {
        // If a private key is provided, derive the public key from it
        sodium.crypto_sign_ed25519_sk_to_pk(publicKey, privateKey); // Derive the public key from the given private key using sodium's crypto_sign_ed25519_sk_to_pk function
    }

    // Return an object containing the private and public key buffers
    return {
        privateKey: privateKey,
        publicKey: publicKey
    }
}

/**
 * Function to generate an Onion v3 address from a public-private key pair
 * @param {Buffer|false} privateKey - A buffer containing the private key or false if a new key pair is to be generated
 * @returns {Object} An object containing the public and private key buffers, the Onion v3 address and a verification flag
 */
const generateOnionV3 = (privateKey = false) => {
    let keys;
    let addr;
    let veri;

    if (privateKey === false) {
        // If no private key is provided, generate a new key pair
        keys = generateKeys();
    } else {
        // If a private key is provided, use it to derive the public key
        keys = generateKeys(privateKey);
    }

    // Generate Onion v3 address
    addr = (() => {
        const version = Buffer.from([0x03]); // Version byte

        // Calculate checksum
        const hash = crypto.createHash('sha3-256');
        hash.update(Buffer.from(".onion checksum"));
        hash.update(keys.publicKey);
        hash.update(version);
        const checksum = hash.digest().slice(0, 2);

        // Combine public key, checksum and version into a single buffer
        const decoded = Buffer.concat([keys.publicKey, checksum, version]);

        // Encode the buffer as base32 and append ".onion" suffix to get the Onion v3 address
        return base32.encode(Array.from(decoded)).toLowerCase() + ".onion";
    })()

    // Verify Onion v3 address (https://gist.github.com/andris9/ee2eb15cb3f729bae69a84258caef1ff)
    veri = (() => {
        if (!/\.onion$/i.test(addr) || addr.length != 56 + 6) {
            return false;
        }

        // Decode the base32 encoded public key, checksum and version from the address
        let base32Encoded = addr.substr(0, addr.length - 6).toUpperCase();
        let decoded;
        try {
            decoded = Buffer.from(base32.decode.asBytes(base32Encoded));
        } catch (err) {
            return false;
        }

        const version = decoded.slice(decoded.length - 1);
        if (!version || !version[0] || version[0] !== 3) {
            return false;
        }

        const checksum = decoded.slice(decoded.length - 3, decoded.length - 1);
        const pubkey = decoded.slice(0, decoded.length - 3);

        // Calculate the checksum again using the same process as before
        const hash = crypto.createHash('sha3-256');
        hash.update(Buffer.from(".onion checksum"));
        hash.update(pubkey);
        hash.update(version);

        const calculatedChecksum = hash.digest().slice(0, 2);

        // Compare the calculated checksum with the decoded checksum to verify the address
        return calculatedChecksum.toString("hex") === checksum.toString("hex") ? pubkey : false;
    })();

    // Return an object containing the public and private key buffers, the Onion v3 address and a verification flag
    return {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        address: addr,
        verified: veri ? Buffer.compare(veri, keys.publicKey) === 0 : false
    }
}

module.exports = {generateOnionV3, generateKeys}