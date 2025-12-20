import got from 'got';
import {
  Api4001PortResponse,
  Api4002PortResponse,
  Api4003PortResponse,
  Api4596PortResponse,
} from './type/ApiResponse';

jest.setTimeout(100000);
describe('데이터를 가져오는 테스트 코드 입니다.', function () {
  it('4001 port 에서 transaction 데이터 가져오는 샘플', async function () {
    // json 형태로 응답
    const response = await got({
      method: 'get',
      url: 'http://localhost:4001/transaction?page=1',
    });

    const jsonResponse: Api4001PortResponse = JSON.parse(response.body);
    expect(jsonResponse.list.length).toEqual(10);
  });

  it('4002 port 에서 transaction 데이터 가져오는 샘플', async function () {
    // xml 형태로 응답
    const response = await got({
      method: 'get',
      url: 'http://localhost:4002/transaction?page=1',
    });

    const jsonResponse: Api4002PortResponse = response.body;
    expect(jsonResponse.includes('<transaction>')).toEqual(true);
  });

  it('4003 port 에서 transaction 데이터 가져오는 샘플', async function () {
    // json 형태로 응답
    const response = await got({
      method: 'post',
      url: 'http://localhost:4003/transaction',
      body: `{"page":1}`,
      headers: { 'Content-Type': 'application/json' },
    });

    const jsonResponse: Api4003PortResponse = JSON.parse(response.body);
    expect(jsonResponse.transactionList.length).toEqual(10);
  });

  it('4596 port 에서 storeTransaction 데이터 가져오는 샘플', async function () {
    // storeTransaction 정보를 가져오는 요청 test
    // Transaction을 조회한 이후 나온 storeId, date 정보를 통해, 조회를 할 수 있습니다.
    // 특정 상점(storeId)의 특정 날짜에 판매된 transactionId, productId를 조회할 수 있습니다.
    const response = await got({
      method: 'post',
      url: `http://localhost:4596/store-transaction/5460431`, // http://localhost:4596/store-transaction/${storeId}
      body: `{"page":1,"date":"2021-01-01"}`,
      headers: { 'Content-Type': 'application/json' },
    });

    const jsonResponse: Api4596PortResponse = JSON.parse(response.body);
    expect(jsonResponse.list.length).toEqual(10);
  });
});
