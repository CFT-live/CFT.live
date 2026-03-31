import { listUserRewardsByWallet } from "./dynamo/user-rewards";
import { normalizeWalletAddress } from "./dynamo/shared";

export const handler = async (event: any) => {
  try {
    const params = event?.body ? JSON.parse(event.body) : {};

    // wallet_address must be sourced from the SIWE session by the Next.js route handler
    const wallet_address: string | undefined = params?.wallet_address;
    if (!wallet_address) {
      return { statusCode: 400, body: JSON.stringify({ error: "wallet_address required" }) };
    }

    const rewards = await listUserRewardsByWallet(normalizeWalletAddress(wallet_address));

    return { statusCode: 200, body: JSON.stringify({ rewards }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify(err) };
  }
};
