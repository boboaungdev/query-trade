import { ethers } from "ethers";

import { resError } from "../utils/response.js";

const TRANSFER_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const getProvider = () => {
  const rpcUrl = process.env.BSC_RPC_URL;

  if (!rpcUrl) {
    throw resError(503, "BSC RPC URL is not configured.");
  }

  return new ethers.JsonRpcProvider(rpcUrl);
};

const getUsdtContractAddress = () => {
  const contract = process.env.USDT_BSC_CONTRACT;

  if (!contract || !ethers.isAddress(contract)) {
    throw resError(503, "USDT BSC contract address is not configured.");
  }

  return ethers.getAddress(contract);
};

export const getReceiveAddress = () => {
  const receiveAddress = process.env.USDT_RECEIVE_ADDRESS;

  if (!receiveAddress || !ethers.isAddress(receiveAddress)) {
    throw resError(503, "USDT receive address is not configured.");
  }

  return ethers.getAddress(receiveAddress);
};

export const verifyUsdtBscPayment = async ({
  txHash,
  expectedAmount,
  paymentCreatedAt,
}) => {
  const provider = getProvider();
  const usdtContract = getUsdtContractAddress();
  const receiveAddress = getReceiveAddress();
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt) {
    throw resError(400, "Transaction was not found on BNB Smart Chain.");
  }

  if (receipt.status !== 1) {
    throw resError(400, "Transaction failed on-chain.");
  }

  const currentBlock = await provider.getBlockNumber();
  const minConfirmations = Number(process.env.BSC_MIN_CONFIRMATIONS || 3);
  const confirmations = currentBlock - receipt.blockNumber + 1;

  if (confirmations < minConfirmations) {
    throw resError(
      400,
      `Transaction needs ${minConfirmations} confirmations before verification.`,
    );
  }

  const block = await provider.getBlock(receipt.blockNumber);
  const paymentCreatedTime = new Date(paymentCreatedAt).getTime();
  const blockTime = block?.timestamp ? block.timestamp * 1000 : 0;

  if (blockTime && blockTime < paymentCreatedTime - 5 * 60 * 1000) {
    throw resError(400, "Transaction is older than this payment request.");
  }

  const iface = new ethers.Interface(TRANSFER_ABI);
  const expectedValue = ethers.parseUnits(String(expectedAmount), 18);
  const transferTopic = iface.getEvent("Transfer").topicHash;

  for (const log of receipt.logs) {
    if (ethers.getAddress(log.address) !== usdtContract) {
      continue;
    }

    if (log.topics[0] !== transferTopic) {
      continue;
    }

    const parsedLog = iface.parseLog(log);
    const [from, to, value] = parsedLog.args;

    if (
      ethers.getAddress(to) === receiveAddress &&
      value === expectedValue
    ) {
      return {
        from: ethers.getAddress(from),
        to: ethers.getAddress(to),
        amount: Number(ethers.formatUnits(value, 18)),
        blockNumber: receipt.blockNumber,
      };
    }
  }

  throw resError(
    400,
    `Send exactly ${expectedAmount} USDT BEP20 to the shown address.`,
  );
};
