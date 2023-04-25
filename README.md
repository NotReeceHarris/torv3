# 🧅 TorV3

This npm package generates Tor v3 addresses along with their corresponding public and private keys. Tor v3 addresses are a type of onion address used by the Tor network for enhanced anonymity and security. By using this package, users can easily generate unique Tor v3 addresses that are difficult to trace back to their source, providing an additional layer of privacy to their online activities. The generated keys are matched to ensure the integrity and security of the address.

## Installation

Installing torv3 is a straightforward process. First, ensure that you have [Node.js](https://nodejs.org/) version `12.x` or higher and a node package manager (such as [NPM](https://www.npmjs.com/)) installed on your system.

To install torv3, open your terminal or command prompt and enter the following command:

```
npm i -g torv3@latest
```

This command will install torv3 globally on your system, making it available to use from any directory.

After installation, you can confirm that torv3 is working correctly by running the following command in your terminal:

```
torv3 --version
```

This should display the version number of torv3 that you just installed.

## Usage

Utilizing torv3 is straightforward and can be accomplished in two ways: through the command-line interface (CLI) or as a module. see the [API](#api) guide for more details.

### Module

```js
const torv3 = require('torv3');

const keys = torv3.generateKeys();
/*{
   privateKey: <Buffer>,  // ed25519 private key
   publicKey: <Buffer>    // ed25519 public key
}*/

const v3 = torv3.generateOnionV3();
/*{
   publicKey: <Buffer>,   // ed25519 public key
   privateKey: <Buffer>,  // ed25519 private key
   address: <String>,     // TorV3 address
   verified: true         // Verify the address checksum match, the ed25519 public key.
}*/

```

### CLI

```
torv3 --help
```

This will display the help menu

```
torv3 [command]

Commands:
  torv3 keys      Generate ed25519 private and public keys
  torv3 generate  Generate a tor onion v3 address

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

## API

### `torv3.generateKeys`
```js
torv3.generateKeys(sk)
```
Generates a pair of `ed25519` keys.
- `sk` is an optional buffer of the ed25519 private key.

# 

### `torv3.generateOnionV3`
```js
torv3.generateOnionV3(sk)
```
Generates a `ed25519` key pair and `v3` hostname.
- `sk` is an optional buffer of the ed25519 private key.
