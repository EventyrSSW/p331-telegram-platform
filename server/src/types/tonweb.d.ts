declare module 'tonweb' {
  export interface Transaction {
    transaction_id: {
      lt: string;
      hash: string;
    };
    utime: number;
    fee: string;
    in_msg?: {
      source: string;
      destination: string;
      value: string;
      message?: string;
    };
    out_msgs: Array<{
      source: string;
      destination: string;
      value: string;
      message?: string;
    }>;
  }

  export interface HttpProvider {
    getTransactions(address: string, limit?: number, lt?: number, txhash?: string): Promise<Transaction[]>;
    getAddressInfo(address: string): Promise<{
      balance: string;
      state: string;
      last_transaction_id?: {
        lt: string;
        hash: string;
      };
    }>;
  }

  export default class TonWeb {
    static utils: {
      toNano(amount: number | string): string;
      fromNano(amount: string): string;
      Address: new (address: string) => { toString(isUserFriendly?: boolean, isUrlSafe?: boolean, isBounceable?: boolean, isTestOnly?: boolean): string };
    };

    static HttpProvider: new (host: string, options?: { apiKey?: string }) => HttpProvider;

    provider: HttpProvider;

    constructor(provider?: HttpProvider);

    getTransactions(address: string, limit?: number, lt?: number, txhash?: string): Promise<Transaction[]>;
  }
}
