const fs = require('fs');
const axios = require("axios");
const tor_axios = require('tor-axios');
require('dotenv').config();
const send = require('./send');
const captcha = require("2captcha");
var FormData = require("form-data");
const telebot = require('node-telegram-bot-api');
const bot = new telebot("5788449732:AAGRE3aV2Rah564ETxOzPt0P5X8KYuVapwk");

const tor = tor_axios.torSetup({ ip: 'localhost', port: 9050, controlPort: '9051', controlPassword: 'giraffe', });

let number = 0;
const BaseUrl = "https://witnessonchain.com/faucet/space";

async function claim() {
  const wallet = await send.createWallet();
  let data = new URLSearchParams({
    receiver_address: wallet.address,
    captcha: 'ASr1',
    submit: 'Shoot me the coin'
  });
  const success = '✅ Cheeeeeers!';
  const failed = '❌ ip on blacklist';

  let session = 'session=.eJwNyMsRgDAIBcBeqIB8gGA35JGMRw_eHHvXPe5DiOvGGXQQlrS6skqoZwS6oM9h0JIzLHnkLs4QY_zTfJpi1FXMhdG20_sBoKQWpA.ZAi9zQ.5BZVcdlkIDA5abuL5Bb1-lmrHEg; HttpOnly; Path=/';

  try {
    const result = await axios.post(BaseUrl, data, { headers: { 'Cookie': session } });
    if (result.data.includes(success)) {
      console.log(wallet)
      const txId = await send.createSignatures(wallet);
      number += 1;
      console.log(`[${number}]\u001b[32m${success} success claim faucet: ${txId.substring(0, 12)}...\u001b[0m`);
      bot.sendMessage(-1001800025230, `${number}] ${success} success claim faucet: [${txId.substring(0, 12)}...](https://www.mvcscan.com/tx/${txId})`, { parse_mode: 'Markdown' });

      const wallets = await send.createWallet();
      await send.safeTrade()
      await claim(wallets);

    } else if (result.data.includes(failed)) {
      await tor.torNewSession();
      console.log(`failed claim faucet : ${failed} `);
      await send.sleep(2000);
      const wallets = await send.createWallet();
      await claim(wallets);

    } else {
      await tor.torNewSession();
      await send.sleep(2000);
      const wallets = await send.createWallet();
      await claim(wallets)
    }
  } catch (err) {
    await tor.torNewSession();
    console.error(`\u001b[31m${err.message}\u001b[0m`);
    await send.sleep(2000);
    const wallets = await send.createWallet();
    await claim(wallets);
  }
}

claim()