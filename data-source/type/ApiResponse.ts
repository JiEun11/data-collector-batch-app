export interface Api4001PortResponse {
  list: {
    amount: number;
    balance: number;
    cancelYn: string;
    date: string; // yyyy-MM-dd;
    storeId: string;
    transactionId: string;
  }[];
  pageInfo: { totalPage: number };
}

// xml형태 데이터 입니다.
/**
 * sample
 * <?xml version="1.0" encoding="UTF-8"?>
 * <result>
 *    <list>
 *        <transaction>
 *            <amount>44906</amount>
 *            <balance>123</balance>
 *            <cancelYn>Y</cancelYn>
 *            <date>2022-07-11</date>
 *            <storeId>2033935</storeId>
 *            <transactionId>e0af8fd4-977a-4db3-b2ea-8fbe007708c9</transactionId>
 *        </transaction>
 *        <transaction>
 *            <amount>20704</amount>
 *            <balance>444</balance>
 *            <cancelYn>N</cancelYn>
 *            <date>2022-07-11</date>
 *            <storeId>5460432</storeId>
 *            <transactionId>5d622087-f210-4b8d-adab-2ea150652be3</transactionId>
 *        </transaction>
 *    </list>
 *    <hasNextPage>false</hasNextPage>
 * </result>
 */
export type Api4002PortResponse = string;

export interface Api4003PortResponse {
  transactionList: {
    AMOUNT: number;
    BALANCE: number;
    CANCEL_YN: string;
    DATE: string; // yyyy-MM-dd;
    STORE_ID: string;
    TRANSACTION_ID: string;
  }[];
  page: { totalPageCount: number };
}

export interface Api4596PortResponse {
  list: {
    storeId: string;
    transactionId: string;
    productId: string;
  }[];
  pageInfo: { totalPage: number };
}
