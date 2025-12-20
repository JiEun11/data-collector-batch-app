> 해당 문제에 대한 저작권은 주식회사 비바리퍼블리카(이하 '회사')에게 있으며 수령자는 오로지 채용을 위한 목적으로만 해당 문제를 활용할 수 있습니다.

> 사유를 불문하고 해당 문제의 전부 또는 일부를 공개, 게재, 배포, 제3자에게 제공 하는 등의 일체의 누설 행위에 대해서는 저작권법에 의한 민.형사상의 책임을 질 수 있습니다.
---

# 사전 과제

일정 주기로 데이터를 수집, 변환, 저장할 수 있는 배치 어플리케이션을 구현해 주세요.

## 제약 사항

- Typescript 로 구현해 주세요.
- assignment-template에 구현된 기존 코드를 변경하셔도 상관 없습니다.
- HTTP 요청 라이브러리는 원하시는 라이브러리를 이용하셔도 좋습니다.
- **본 제약 사항 이외의 부분은 개인이 판단하기에 효율적인 방안을 찾아서 구현해 주시기 바랍니다. 모든 지원자 분들께 동일한 경험을 제공해 드리기 위해, 개별적인 과제 관련 문의 사항은 답변 드리기 어려움을 양해 부탁 드립니다.**

## 과제 템플릿 초기 세팅 방법

- npm install
- 본 과제 템플릿은 Node.js 16버전에서 작성되었습니다. node 16 이상 버전을 사용하길 권장드립니다.
- npm run start 를 하면, 배치가 실행됩니다.

## 과제 구현에 사용될 데이터 정의

- [Transaction](src/batch/type/transaction.ts)
- [StoreTransaction](src/batch/type/store-transaction.ts)
- [MergeTransaction](src/batch/type/merge-transaction.ts)
- Transaction의 정보를 활용하여, StoreTransaction을 조회할 수 있습니다.
- Transaction정보와 StoreTransaction정보를 합하여, MergeTransaction을 구성할 수 있습니다.

## 과제 요구사항

- 10분 주기로 각 ***포트별 api와 csv에서 Transaction 정보를 수집하고*** 이를 이용하여 MergeTransaction을 구성하고, database에 저장해 주세요.
  - Transaction data-source가 미래에도 확장 될 수 있음을 고려하여 확장성 있게 구현해 주세요.
- 이미 수집된 MergeTransaction 데이터는 중복 저장 되지 않도록 구현해 주세요.
- 최대한의 test coverage를 확보할 수 있도록, 단위 테스트를 작성해 주세요.
- 로컬에 실행된, 가상의 data source server는 확률적으로 네트워크 오류가 발생합니다.
  - Http status code 502 error 발생 시, 4001 port는 retry를 1번, 4002 port는 retry를 2번, 4003 port는 retry를 3번 할 수 있도록 구현해 주세요. 
- Logger를 구현해 주세요.
  - Logger 인터페이스는 [다음](src/log/type/batch-logger.ts)과 같습니다.
  - Logger를 이용하여 네트워크 오류 발생했을 때 어떤 요청에서 오류가 발생하였는지 로그를 남겨 주세요.
  - Logging된 정보들도 database에 저장해 주세요.
- 배치 실행 중 오류가 발생하여 배치 전체가 멈추는 경우, 어떤 코드에서 오류가 발생했는 지 유추할 수 있는 정보를 console.log를 통해 남겨주세요.

## 데이터 소스 설명

- 데이터 소스 서버 실행 방법
  - npm run start:data-source
  - 데이터 소스 서버 실행 시, [transaction.csv](./data-source/transaction.csv) 자동생성 됩니다.
- 데이터 소스 설명
  - http://localhost의 4001,4002,4003번 포트는 Transaction 데이터를 조회할 수 있는 api를 제공하고 있습니다.
    - 로컬 서버의 각 데이터 호출 샘플은 [data-source/fetch-data-source.spec.ts](./data-source/fetch-data-source.spec.ts) 파일에 구현해 놓았습니다.
    - 각 데이터 소스의 응답 형태는 [ApiResponse.ts](./data-source/type/ApiResponse.ts) 에 정리되어 있습니다.
    - 모든 요청의 page 값은 1 이상의 정수 입니다. (정수가 아닌 소수를 입력하는 경우엔 http 400 code로 응답하게 됩니다.)
  - csv파일에서도 Transaction 정보가 적재되어 있으며, 이는 [data-source/transaction.csv](./data-source/transaction.csv)에 주기적으로 파일이 업로드 된다고 가정합니다.
    - 해당 csv파일 데이터도 10분 단위로 수집이 필요합니다.
    - csv파일에 대한 설명은 다음 링크를 참고해 주세요. https://ko.wikipedia.org/wiki/CSV_(파일_형식)
  - http://localhost의 4596번 포트는 StoreTransaction 데이터를 조회할 수 있는 api를 제공하고 있습니다.
    - 데이터 호출 샘플은 [data-source/fetch-data-source.spec.ts](./data-source/fetch-data-source.spec.ts) 파일에 `4596 port 에서 storeTransaction 데이터 가져오는 샘플` 테스트에 구현해 놓았습니다.
    - StoreTransaction의 조회 arguments로 쓰이는 storeId, date는 앞서 조회한 Transaction의 storeId, date 정보 입니다. 즉, storeTransaction 조회 api는 특정 상점(storeId)의 특정 날짜에 판매된 transactionId, productId를 조회할 수 있습니다. 

## 제출 방법

- node_modules,dist 폴더를 삭제하시고 해당 프로젝트를 압축해 주세요.
- 압축된 파일이름은 다음과 같은 예시대로 작성해 주세요.
  - 홍길동\_20230101_Nodejs.zip
- 과제 제출은, 과제일정 조율시 전달드렸던 메일에 안내된 링크를 통해 제출해 주세요.
