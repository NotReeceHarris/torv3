#!/usr/bin/env node

const base32 = require('hi-base32'); // Module for encoding and decoding base32 strings
const sodium = require('sodium-native'); // Module for using cryptography functions provided by libsodium library
const crypto = require('crypto'); // Built-in module for using cryptography functions

// Linux support
const {
  performance
} = require('perf_hooks');

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
	};
};

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
		hash.update(Buffer.from('.onion checksum'));
		hash.update(keys.publicKey);
		hash.update(version);
		const checksum = hash.digest().slice(0, 2);

		// Combine public key, checksum and version into a single buffer
		const decoded = Buffer.concat([keys.publicKey, checksum, version]);

		// Encode the buffer as base32 and append ".onion" suffix to get the Onion v3 address
		return base32.encode(Array.from(decoded)).toLowerCase() + '.onion';
	})();

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
		hash.update(Buffer.from('.onion checksum'));
		hash.update(pubkey);
		hash.update(version);

		const calculatedChecksum = hash.digest().slice(0, 2);

		// Compare the calculated checksum with the decoded checksum to verify the address
		return calculatedChecksum.toString('hex') === checksum.toString('hex') ? pubkey : false;
	})();

	// Return an object containing the public and private key buffers, the Onion v3 address and a verification flag
	return {
		publicKey: keys.publicKey,
		privateKey: keys.privateKey,
		address: addr,
		verified: veri ? Buffer.compare(veri, keys.publicKey) === 0 : false
	};
};

/**
 * Function generates a vanity onion address with the prefix specified by the targetPrefix parameter
 * @param {String} targetPrefix - The targetPrefix for the vanity url
 * @returns {Object} An object containing the public and private key buffers, the Onion v3 address and a verification flag
 */
const vanityOnionV3 = (targetPrefix) => {

	const regex = new RegExp('^(?=.{0,56}$)[a-z2-7]+$');

	if (!regex.test(targetPrefix)) {
		throw new Error('The provided prefix is invalid (^(?=.{0,56}$)[a-z2-7]+$)');
	}

	// Record the start time to calculate the total time taken to generate the onion address
	const start = performance.now();
  
	let count = 0; // Keep track of the number of attempts it takes to generate the onion address
	let v3; // The onion address generated by generateOnionV3()
  
	// Loop until an onion address is generated with the desired prefix
	do {
		try {
			v3 = generateOnionV3();

			if (require.main === module) {
				process.stdout.write('\r' +  `Current lookups: ${count}, Time elapsed: ${parseInt((performance.now() - start) / 1000)}/s`);
			}

		} catch (error) {
			// Handle any errors that may occur during address generation, e.g. log them or throw a custom error
			console.error(error);
			continue; // Continue the loop if an error occurs
		}
		count++; // Increment the count of attempts made
	} while (!v3.address.startsWith(targetPrefix)); // Keep looping until an onion address is generated with the desired prefix
  
	// Record the number of attempts made and the time taken to generate the onion address
	v3.lookups = count;
	v3.elapsed = (performance.now() - start) / 1000;
  
	return v3; // Return the generated onion address with the number of attempts and time taken to generate it
};
  

// Check if the file is being run directly using node
if (require.main === module) {

	// Require yargs module to parse command line arguments
	const yargs = require('yargs');

	// Define command line interface for "keys" command
	yargs.command({
		command: 'keys',
		describe: 'Generate ed25519 private and public keys',
		builder: {
			private: {
				describe: 'A private key in hex format',
				demandOption: false,
				type: 'string'
			}
		},
		handler(argv) {
			let keys;

			// Generate keys if private key argument is not provided
			if (argv.private) {
				keys = generateKeys(Buffer.from(argv.private, 'hex'));
			} else {
				keys = generateKeys();
			}

			// Output private and public keys in hex format
			console.log('\nPrivate key:\t', keys.privateKey.toString('hex'));
			console.log('Public key:\t', keys.publicKey.toString('hex'), '\n');
		}
	})

	// Define command line interface for "generate" command
		.command({
			command: 'generate',
			describe: 'Generate a tor onion v3 address',
			builder: {
				private: {
					describe: 'A private key in hex format',
					demandOption: false,
					type: 'string'
				}
			},
			handler(argv) {
				let v3;

				// Generate onion v3 address if private key argument is not provided
				if (argv.private) {
					v3 = generateOnionV3(Buffer.from(argv.private, 'hex'));
				} else {
					v3 = generateOnionV3();
				}

				// Output private key, public key, and onion v3 address
				console.log('\nPrivate key:\t', v3.privateKey.toString('hex'));
				console.log('Public key:\t', v3.publicKey.toString('hex'));
				console.log('Hostname:\t', v3.address);
				console.log('Valid:\t\t', v3.verified, '\n');
			}
		})
	
	// Define command line interface for "generate" command
		.command({
			command: 'vanity',
			describe: 'Generate a vanity tor onion v3 address',
			builder: {
				prefix: {
					describe: 'The desired vanity prefix',
					demandOption: true,
					type: 'string'
				}
			},
			handler(argv) {
				console.log('\nRunning generation now, this may take a while! The time complexity is O(2^256) (The longe the vanity the longer the longer it will take)');

				let v3 = vanityOnionV3(argv.prefix);

				// Output private key, public key, and onion v3 address
				console.log('\n\nPrivate key:\t', v3.privateKey.toString('hex'));
				console.log('Public key:\t', v3.publicKey.toString('hex'));
				console.log('Hostname:\t', v3.address);
				console.log('Valid:\t\t', v3.verified);
				console.log('Lookups:\t', v3.lookups);
				console.log('elapsed:\t', v3.elapsed, '\n');
			}
		})

	// Parse the command line arguments
		.argv;
} else {

	// If the file is being imported as a module, export the generateOnionV3 and generateKeys functions
	module.exports = {generateOnionV3, generateKeys, vanityOnionV3};
} 
