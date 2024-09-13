import { Web3 } from "web3"
import { bytesToHex } from '@ethereumjs/util';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { deriveChildPublicKey, najPublicKeyStrToUncompressedHexPoint, uncompressedHexPointToEvmAddress } from '../services/kdf';
import { Common } from '@ethereumjs/common'
import { Contract, JsonRpcProvider } from "ethers";
import { parseNearAmount } from "near-api-js/lib/utils/format";

export class Ethereum {
  constructor(chain_rpc, chain_id) {
    this.web3 = new Web3(chain_rpc);
    this.provider = new JsonRpcProvider(chain_rpc);
    this.chain_id = chain_id;
    this.queryGasPrice();
  }

  async deriveAddress(accountId, derivation_path) {
    const publicKey = await deriveChildPublicKey(najPublicKeyStrToUncompressedHexPoint(), accountId, derivation_path);
    const address = await uncompressedHexPointToEvmAddress(publicKey);
    return { publicKey: Buffer.from(publicKey, 'hex'), address };
  }

  async queryGasPrice() {
    const maxFeePerGas = await this.web3.eth.getGasPrice();
    const maxPriorityFeePerGas = await this.web3.eth.getMaxPriorityFeePerGas();
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  async getBalance(accountId) {
    const balance = await this.web3.eth.getBalance(accountId);
    return this.web3.utils.fromWei(balance, "ether");
  }

  async getContractViewFunction(receiver, abi, methodName, args = []) {
    const contract = new Contract(receiver, abi, this.provider);

    return await contract[methodName](...args);
  }

  createTransactionData(receiver, abi, methodName, args = []) {
    const contract = new Contract(receiver, abi);

    return contract.interface.encodeFunctionData(methodName, args);
  }

  async createPayload(sender, receiver, amount, data) {
    const common = new Common({ chain: this.chain_id });

    // Get the nonce & gas price
    const nonce = await this.web3.eth.getTransactionCount(sender);
    let { maxFeePerGas, maxPriorityFeePerGas } = await this.queryGasPrice();

    // const highGasPrice = BigInt(maxFeePerGas) * BigInt(12) / BigInt(10); // Incremento del 20%
    // const highPriorityFee = BigInt(maxPriorityFeePerGas) * BigInt(12) / BigInt(10); // Incremento del 20%

    // maxFeePerGas = highGasPrice;
    // maxPriorityFeePerGas = highPriorityFee;

    // let maxFee = Number(maxFeePerGas) * 2;
    // let maxPriority = Number(maxPriorityFeePerGas) * 2;
    // maxFeePerGas = BigInt(maxFee);
    // maxPriorityFeePerGas = BigInt(maxPriority);

    // Construct transaction
    const transactionData = {
      nonce,
      // gasLimit: 50_000,
      gasLimit: 25000000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      to: receiver,
      data: data,
      value: BigInt(this.web3.utils.toWei(amount, "ether")),
      chain: this.chain_id,
    };

    // Create a transaction
    const transaction = FeeMarketEIP1559Transaction.fromTxData(transactionData, { common });
    const payload = transaction.getHashedMessageToSign();

    // Store in sessionStorage for later
    sessionStorage.setItem('transaction', transaction.serialize());

    return { transaction, payload };
  }

  async requestSignatureToMPC(wallet, contractId, path, ethPayload) {
    // Ask the MPC to sign the payload
    sessionStorage.setItem('derivation', path);

    const payload = Array.from(ethPayload);
    const { big_r, s, recovery_id } = await wallet.callMethod({ contractId, method: 'sign', args: { request: { payload, path, key_version: 0 } }, gas: '250000000000000', deposit: parseNearAmount('0.05') });
    return { big_r, s, recovery_id };
  }

  async reconstructSignature(big_r, S, recovery_id, transaction) {
    // reconstruct the signature
    const r = Buffer.from(big_r.affine_point.substring(2), 'hex');
    const s = Buffer.from(S.scalar, 'hex');
    const v = recovery_id;

    const signature = transaction.addSignature(v, r, s);

    if (signature.getValidationErrors().length > 0) throw new Error("Transaction validation errors");
    if (!signature.verifySignature()) throw new Error("Signature is not valid");
    return signature;
  }

  async reconstructSignatureFromLocalSession(big_r, s, recovery_id, sender) {
    const serialized = Uint8Array.from(JSON.parse(`[${sessionStorage.getItem('transaction')}]`));
    const transaction = FeeMarketEIP1559Transaction.fromSerializedTx(serialized);
    console.log("transaction", transaction)
    return this.reconstructSignature(big_r, s, recovery_id, transaction, sender);
  }

  // This code can be used to actually relay the transaction to the Ethereum network
  async relayTransaction(signedTransaction) {
    const serializedTx = bytesToHex(signedTransaction.serialize());
    const relayed = await this.web3.eth.sendSignedTransaction(serializedTx);
    return relayed.transactionHash
  }

  async submmitTx(signedTransaction)
  {
    // let provider = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/408559c55ba7479b9f3adee094af9d80");
    // tx = 0x02f87483aa36a7808402b8458584485d116e82c35094e0f3b7e68151e9306727104973752a415c2bcbeb8711c37937e0800080c080a053fb82fa267cc33f0eb653cd8ff1f05f15c391297f42cd138560851353506748a05daea264de35f45a89faa84965fc6afc12d2f9fb1ba2f323e7e8204f9c5ac0c5;

    console.log("SIGNED_TX");
    console.log("TYPE_OF");
    console.log(typeof(signedTransaction));
    console.log(signedTransaction);
    const serializedTx = bytesToHex(signedTransaction.serialize());
    console.log("SERIALIZED_TX");
    console.log("TYPE_OF");
    console.log(typeof(serializedTx));
    console.log(serializedTx);

    console.log("/////////////////SIGNER ADDRESS TEST/////////////////");
    console.log("SIGNER_ADDRESS:");
    // const txAddress = web3.eth.accounts.recoverTransaction(serializedTx);
    // console.log(txAddress);

    let submittedTx = await this.provider.broadcastTransaction(serializedTx);
    console.log("SUBMMITED_TX:");
    console.log(submittedTx);

    const txReceipt = await submittedTx.wait(1);
    console.log("TX RECEIPT");
    console.log(txReceipt);

    // const relayed = await this.web3.eth.sendSignedTransaction(serializedTx);
    // console.log("RELAYED");
    // console.log(relayed);
    // return relayed.transactionHash

    // let submittedTx = await provider.sendTransaction( serializedTx );
    // console.log("SUBMITTED TX");
    // console.log(submittedTx);

    // const txReceipt = await submittedTx.wait(1);
    // console.log("TX RECEIPT");
    // console.log(txReceipt);
  }
}