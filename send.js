const bip32 = require('bip32');
const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const mvc = require('mvc-lib');
const axios = require("axios");
const Transaction = mvc.Transaction;
const Script = mvc.Script
require('dotenv').config();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createWallet() {
  const path = `m/44'/10001'/0'`;
  const network = bitcoin.networks.bitcoin;
  try {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);
    const account = root.derivePath(path);
    const node = account.derive(0).derive(0);
    const address = bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: network }).address;
    const key = node.toWIF();
    const wallet = { address: address, mnemonic: mnemonic, privateKey: key };
    return wallet;
  } catch (err) {
    console.error(`createWallet err: ${err.message}`)
  }
}

async function getUtxo(address) {
  try {
    let url = `https://api-mvc.metasv.com/address/${address}/utxo`;
    const result = await axios.get(url);
    return result.data[0];
  } catch (err) {
    console.error(`getUTXO err: ${err.message}`)
  }
}

async function createSignatures(wallet) {
  try {
    const utxo = await getUtxo(wallet.address);
    const simpleTx = { address: wallet.address, txid: utxo.txid, outputIndex: utxo.outIndex, script: Script.buildPublicKeyHashOut(wallet.address).toString(), satoshis: utxo.value };
    const transaction = new Transaction().from(simpleTx).to(process.env.safeTrade, 19700).change(process.env.safeTrade).fee(300).sign(wallet.privateKey);
    const signatures = transaction.serialize();
    return send(signatures);
  } catch (err) { await sleep(3000); return createSignatures(wallet); }
}

async function send(signatures) {
  let url = 'https://api-mvc.metasv.com/tx/broadcast';
  let status = false;
  try {
    const hex = { "hex": signatures }
    const result = await axios.post(url, hex);
    if (result.data.txid != null || result.data.message === null) { status = true; } else { status = false; };
    return result.data.txid;
  } catch (err) {
    console.error(`send err: ${err.message}`)
  }
}

async function safeTrade() {
  try {
    const utxo = await getUtxo(process.env.address)
    const simpleTx = { address: utxo.address, txid: utxo.txid, outputIndex: utxo.outIndex, script: Script.buildPublicKeyHashOut(utxo.address).toString(), satoshis: utxo.value };
    const transaction = new Transaction().from(simpleTx).to(process.env.safeTrade, 19700).change(process.env.safeTrade).fee(0).sign(process.env.privateKey);
    const signatures = transaction.serialize();
    const tx = await send(signatures);
    console.log(tx)
  } catch (err) {
    console.error(err.message)
  }
}


module.exports = { createWallet, createSignatures, sleep, safeTrade }