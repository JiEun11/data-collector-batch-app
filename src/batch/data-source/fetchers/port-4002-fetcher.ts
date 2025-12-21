import axios, { AxiosInstance } from 'axios';
import { Transaction, TransactionFetcher } from '../../type/transaction';
import { createRetryPolicy } from '../../../common/utils/retry';
import { BatchLogger } from '../../../log/type/batch-logger';

/**
 * @description 4002 포트에서 Transaction을 가져오는 Fetcher
 *
 * 특징:
 * - HTTP Method: GET
 * - URL: http://localhost:4002/transaction?page=N
 * - 응답 형식: XML (string)
 * - Retry 횟수: 2번
 *
 * XML 응답 예시:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <result>
 *   <list>
 *     <transaction>
 *       <amount>44906</amount>
 *       <balance>123</balance>
 *       <cancelYn>Y</cancelYn>
 *       <date>2022-07-11</date>
 *       <storeId>2033935</storeId>
 *       <transactionId>e0af8fd4-977a-4db3-b2ea-8fbe007708c9</transactionId>
 *     </transaction>
 *     <transaction>
 *       ...
 *     </transaction>
 *   </list>
 *   <hasNextPage>false</hasNextPage>
 * </result>
 */
export class Port4002Fetcher implements TransactionFetcher {
  private axiosInstance: AxiosInstance;
  private retryPolicy: (fn: () => Promise<any>) => Promise<any>;

  constructor(private logger: BatchLogger) {
    this.axiosInstance = axios.create({
      baseURL: 'http://localhost:4002',
      timeout: 2000,
    });

    // 502 에러 발생 시 2번까지 재시도
    this.retryPolicy = createRetryPolicy(2, 200);
  }

  /**
   * @description 특정 페이지의 Transaction 데이터를 가져옴
   * @param page 페이지 번호 (1 이상의 정수)
   * @returns Transaction 배열
   */
  async fetch(page: number): Promise<Transaction[]> {
    // 페이지 번호 유효성 검사
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('page must be integer >= 1');
    }

    const url = `/transaction?page=${page}`;

    try {
      // Retry 정책을 적용하여 HTTP 요청
      const response = await this.retryPolicy(() =>
        this.axiosInstance.get<string>(url),
      );

      const xmlBody = response.data;

      // XML 문자열을 파싱하여 Transaction 배열로 변환
      return this.parseXml(xmlBody);
    } catch (error) {
      // 에러 로깅 (네트워크 오류 발생 시)
      this.logger.error('Port4002Fetcher.fetch error', error?.stack, {
        url: `http://localhost:4002${url}`,
        page,
        error: error?.message ?? error,
      });
      throw error;
    }
  }

  /**
   * @description XML 문자열을 파싱하여 Transaction 배열로 변환
   *
   * 작동 방식:
   * 1. 정규식으로 <transaction>...</transaction> 블록을 모두 찾음
   * 2. 각 블록에서 태그별 값을 추출
   * 3. Transaction 객체로 변환
   *
   * @param xml XML 문자열
   * @returns Transaction 배열
   */
  private parseXml(xml: string): Transaction[] {
    const transactions: Transaction[] = [];

    // <transaction>...</transaction> 블록을 모두 찾는 정규식
    const transactionRegex = /<transaction>([\s\S]*?)<\/transaction>/g;
    let match;

    // 모든 transaction 블록 순회
    while ((match = transactionRegex.exec(xml)) !== null) {
      const txXml = match[1]; // <transaction> 태그 안의 내용

      // 각 필드 추출하여 Transaction 객체 생성
      transactions.push({
        amount: parseInt(this.extractTag(txXml, 'amount')),
        balance: parseInt(this.extractTag(txXml, 'balance')),
        cancelYn: this.extractTag(txXml, 'cancelYn') as 'Y' | 'N',
        date: this.extractTag(txXml, 'date'),
        storeId: this.extractTag(txXml, 'storeId'),
        transactionId: this.extractTag(txXml, 'transactionId'),
      });
    }

    return transactions;
  }

  /**
   * @description XML 태그에서 값을 추출하는 헬퍼 함수
   *
   * 예시:
   * extractTag("<amount>1000</amount>", "amount") → "1000"
   *
   * @param xml XML 문자열
   * @param tagName 추출할 태그 이름
   * @returns 태그 안의 값 (문자열)
   */
  private extractTag(xml: string, tagName: string): string {
    // <tagName>값</tagName> 형태를 찾는 정규식
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`);
    const match = xml.match(regex);

    // 매칭되면 값을 반환하고, 공백 제거
    return match ? match[1].trim() : '';
  }
}
